<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>MyHeat - Схемы</title>
    <script>window.__SCHEMES_PAGE__ = @json($schemes->toArray());</script>
    @vite('resources/js/schemes.jsx')
</head>
<body>
    <div id="schemes-app"></div>
</body>
</html>
