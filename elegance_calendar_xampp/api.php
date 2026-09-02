<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$db   = 'elegance_calendar';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'message'=>'Erro de conexão com o banco. Verifique o XAMPP e importe o arquivo database.sql.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;
$action = $input['action'] ?? '';

function out($data, $code=200){
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function requireUser($pdo, $id){
    $st=$pdo->prepare('SELECT id,name,email,cycle_length,period_length,last_period_start FROM users WHERE id=?');
    $st->execute([(int)$id]);
    $u=$st->fetch();
    if(!$u) out(['ok'=>false,'message'=>'Usuária não encontrada.'],404);
    return $u;
}

try {
switch($action){
case 'register':
    $name=trim($input['name']??''); $email=trim($input['email']??''); $password=$input['password']??'';
    if(!$name || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<4) out(['ok'=>false,'message'=>'Preencha nome, e-mail válido e uma senha com pelo menos 4 caracteres.'],422);
    $check=$pdo->prepare('SELECT id FROM users WHERE email=?'); $check->execute([$email]);
    if($check->fetch()) out(['ok'=>false,'message'=>'Este e-mail já está cadastrado.'],409);
    $hash=password_hash($password,PASSWORD_DEFAULT);
    $st=$pdo->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)');
    $st->execute([$name,$email,$hash]);
    out(['ok'=>true,'user'=>['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email,'last_period_start'=>null]]);

case 'login':
    $email=trim($input['email']??''); $password=$input['password']??'';
    $st=$pdo->prepare('SELECT * FROM users WHERE email=?'); $st->execute([$email]); $u=$st->fetch();
    if(!$u || !password_verify($password,$u['password_hash'])) out(['ok'=>false,'message'=>'E-mail ou senha incorretos.'],401);
    unset($u['password_hash']);
    out(['ok'=>true,'user'=>$u]);

case 'load_data':

    $u = requireUser($pdo, $input['user_id'] ?? 0);

    $uid = (int)$u['id'];


    // ROTINAS
    $r = $pdo->prepare(
        'SELECT * FROM routines 
         WHERE user_id=? 
         ORDER BY id DESC'
    );

    $r->execute([$uid]);


    // RELATOS
    $d = $pdo->prepare(
        'SELECT * FROM reports 
         WHERE user_id=? 
         ORDER BY created_at DESC'
    );

    $d->execute([$uid]);


    // REGISTROS DO CICLO
    $l = $pdo->prepare(
        'SELECT * FROM day_logs 
         WHERE user_id=? 
         ORDER BY log_date'
    );

    $l->execute([$uid]);

    $logs = $l->fetchAll();


    // SINTOMAS
    $symptomsByLog = [];


    if (count($logs) > 0) {

        $ids = array_map(
            function($row) {
                return (int)$row['id'];
            },
            $logs
        );


        $placeholders = implode(
            ',',
            array_fill(0, count($ids), '?')
        );


        $sql = '
            SELECT 
                dls.day_log_id,
                s.name

            FROM day_log_symptoms dls

            INNER JOIN symptoms s
                ON s.id = dls.symptom_id

            WHERE dls.day_log_id IN (' . $placeholders . ')

            ORDER BY s.name
        ';


        $stSymptoms = $pdo->prepare($sql);

        $stSymptoms->execute($ids);


        foreach ($stSymptoms->fetchAll() as $symptom) {

            $logId = (int)$symptom['day_log_id'];


            if (!isset($symptomsByLog[$logId])) {

                $symptomsByLog[$logId] = [];

            }


            $symptomsByLog[$logId][] = $symptom['name'];

        }

    }


    // ADICIONA OS SINTOMAS A CADA REGISTRO

    foreach ($logs as &$row) {

        $row['symptoms'] =
            $symptomsByLog[(int)$row['id']] ?? [];

    }


    unset($row);


    out([
        'ok' => true,

        'data' => [

            'user' => $u,

            'routines' => $r->fetchAll(),

            'reports' => $d->fetchAll(),

            'day_logs' => $logs

        ]
    ]);

case 'save_cycle':
    requireUser($pdo,$input['user_id']??0);
    $st=$pdo->prepare('UPDATE users SET last_period_start=?, cycle_length=?, period_length=? WHERE id=?');
    $st->execute([$input['last_period_start']??null,(int)($input['cycle_length']??28),(int)($input['period_length']??5),(int)$input['user_id']]);
    out(['ok'=>true]);

case 'save_routine':
    requireUser($pdo,$input['user_id']??0); $uid=(int)$input['user_id'];
    $id=$input['id']??null; $title=trim($input['title']??''); $desc=trim($input['description']??''); $icon=trim($input['icon']??'✨'); $done=(int)($input['done']??0);
    if(!$title) out(['ok'=>false,'message'=>'Título da rotina é obrigatório.'],422);
    if($id){
        $st=$pdo->prepare('UPDATE routines SET title=?,description=?,icon=?,done=? WHERE id=? AND user_id=?');
        $st->execute([$title,$desc,$icon,$done,(int)$id,$uid]);
        out(['ok'=>true,'id'=>(int)$id]);
    }
    $st=$pdo->prepare('INSERT INTO routines(user_id,title,description,icon,done) VALUES(?,?,?,?,?)');
    $st->execute([$uid,$title,$desc,$icon,$done]);
    out(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);

case 'delete_routine':
    requireUser($pdo,$input['user_id']??0);
    $st=$pdo->prepare('DELETE FROM routines WHERE id=? AND user_id=?'); $st->execute([(int)$input['id'],(int)$input['user_id']]);
    out(['ok'=>true]);

case 'save_day_log':
    requireUser($pdo,$input['user_id']??0); $uid=(int)$input['user_id']; $date=$input['log_date']??null;
    if(!$date) out(['ok'=>false,'message'=>'Data obrigatória.'],422);
    $st=$pdo->prepare('INSERT INTO day_logs(user_id,log_date,period_start,period_end) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE period_start=VALUES(period_start),period_end=VALUES(period_end)');
    $st->execute([$uid,$date,(int)($input['period_start']??0),(int)($input['period_end']??0)]);
    $idst=$pdo->prepare('SELECT id FROM day_logs WHERE user_id=? AND log_date=?'); $idst->execute([$uid,$date]); $logId=(int)$idst->fetchColumn();
    $pdo->prepare('DELETE FROM day_log_symptoms WHERE day_log_id=?')->execute([$logId]);
    foreach(($input['symptoms']??[]) as $name){
        $name=trim($name); if(!$name) continue;
        $s=$pdo->prepare('INSERT INTO symptoms(name) VALUES(?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)'); $s->execute([$name]); $sid=(int)$pdo->lastInsertId();
        $pdo->prepare('INSERT IGNORE INTO day_log_symptoms(day_log_id,symptom_id) VALUES(?,?)')->execute([$logId,$sid]);
    }
    out(['ok'=>true,'id'=>$logId]);

case 'save_report':
    requireUser($pdo,$input['user_id']??0); $uid=(int)$input['user_id'];
    $id=$input['id']??null; $cat=trim($input['category']??'Outro'); $loc=trim($input['location']??''); $desc=trim($input['description']??''); $anon=(int)($input['is_anonymous']??1);
    if($id){
        $st=$pdo->prepare('UPDATE reports SET category=?,location=?,description=?,is_anonymous=? WHERE id=? AND user_id=?');
        $st->execute([$cat,$loc,$desc,$anon,(int)$id,$uid]);
        out(['ok'=>true,'id'=>(int)$id]);
    }
    $st=$pdo->prepare('INSERT INTO reports(user_id,category,location,description,is_anonymous) VALUES(?,?,?,?,?)');
    $st->execute([$uid,$cat,$loc,$desc,$anon]);
    out(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);

case 'delete_report':
    requireUser($pdo,$input['user_id']??0);
    $st=$pdo->prepare('DELETE FROM reports WHERE id=? AND user_id=?'); $st->execute([(int)$input['id'],(int)$input['user_id']]);
    out(['ok'=>true]);

default:
    out(['ok'=>false,'message'=>'Ação inválida.'],400);
}
} catch(Throwable $e){
    out(['ok'=>false,'message'=>'Erro interno no servidor.'],500);
}
?>