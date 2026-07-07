<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MH Schemes - Admin</title>
    @vite(['resources/css/app.css', 'resources/js/admin.jsx'])
</head>
<body>
    <div id="admin-app"></div>
</body>
</html>
