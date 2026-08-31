<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyHeat - SVG-редактор</title>
    @viteReactRefresh
    @vite('resources/js/svg-editor.jsx')
</head>
<body>
    <div id="svg-editor-app"></div>
</body>
</html>
