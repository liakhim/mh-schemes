<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>MyHeat - Подбор оборудования</title>
    @viteReactRefresh
    @vite('resources/js/selection.jsx')
</head>
<body class="selection-body">
    <div id="selection-app"></div>
</body>
</html>
