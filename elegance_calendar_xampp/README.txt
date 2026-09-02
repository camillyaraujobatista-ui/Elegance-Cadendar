# Elegance Calendar — Projeto TCC

## Arquivos
- index.html: interface atualizada do aplicativo.
- api.php: conexão entre o aplicativo e MySQL.
- database.sql: cria o banco e todas as tabelas.
- logo.png: logo do aplicativo.
- calendario.png, tela inicio.png, denuncias.png e chat.png: ícones usados na interface.

## Como executar no XAMPP
1. Inicie Apache e MySQL no painel do XAMPP.
2. Copie a pasta `elegance_calendar_xampp` para `C:\xampp\htdocs\`.
3. Abra phpMyAdmin em `http://localhost/phpmyadmin`.
4. Importe o arquivo `database.sql`.
5. Abra `http://localhost/elegance_calendar_xampp/index.html`.

## Banco de dados
O banco criado é `elegance_calendar`.

Tabelas:
- users
- routines
- day_logs
- symptoms
- day_log_symptoms
- reports

As relações são feitas por chaves estrangeiras:
users -> routines
users -> day_logs
day_logs -> day_log_symptoms -> symptoms
users -> reports

## Observação
Os números 180, 190 e 100 usam links `tel:` para abrir a chamada telefônica em dispositivos compatíveis.
