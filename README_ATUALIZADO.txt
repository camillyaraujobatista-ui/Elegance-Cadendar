ELEGANCE CALENDAR — VERSÃO ATUALIZADA

ESTRUTURA PRINCIPAL
- index.html  -> estrutura das telas do aplicativo
- style.css   -> todos os estilos visuais
- script.js   -> interações e comunicação com api.php
- api.php     -> API em PHP para login e banco de dados
- database.sql -> criação do banco e das tabelas MySQL/MariaDB
- logo.png    -> nova logo transparente
- calendario.png, chat.png, denuncias.png, tela inicio.png -> imagens da interface

COMO EXECUTAR NO XAMPP
1. Copie a pasta inteira para:
   C:\xampp\htdocs\elegance_calendar_xampp
2. Inicie Apache e MySQL no XAMPP.
3. Abra phpMyAdmin e importe database.sql, caso o banco ainda não exista.
4. Acesse:
   http://localhost/elegance_calendar_xampp/

ACESSO PELO CELULAR NA MESMA REDE
Use o IP IPv4 do computador:
http://SEU-IP/elegance_calendar_xampp/
O computador e o celular devem estar na mesma rede Wi-Fi e o Apache/MySQL devem estar ligados.

ACESSO PÚBLICO PELA INTERNET
Para sair do localhost e ficar acessível publicamente, o projeto precisa ser hospedado em um servidor que suporte PHP e MySQL/MariaDB. Depois será necessário:
- enviar os arquivos do projeto para a hospedagem;
- criar/importar o banco MySQL;
- ajustar as credenciais do banco em api.php;
- configurar domínio e HTTPS;
- testar cadastro, login e persistência dos dados.

IMPORTANTE
Esta versão inclui a correção de load_data compatível com MySQL/MariaDB do XAMPP e separa CSS e JavaScript em arquivos próprios.
