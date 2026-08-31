<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - Графы</title>
    @viteReactRefresh
    @vite('resources/js/graphs.jsx')
</head>
<body>
    <div id="graphs-app"></div>
</body>
</html>
