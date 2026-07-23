<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>MH Schemes — 3D планировщик</title>
    @php
        $initialPlanner = [
            'scheme' => $scheme ? [
                'id' => $scheme->id,
                'name' => $scheme->name,
                'incoming_scheme' => $scheme->incoming_scheme,
                'floor_plan' => $scheme->floor_plan,
            ] : null,
        ];
    @endphp
    <script>
        window.__INITIAL_PLANNER__ = @json($initialPlanner);
    </script>
    @if (app()->environment('local'))
    <script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    @endif
    @vite(['resources/css/planner.css', 'resources/js/planner.jsx'])
</head>
<body>
    <div id="planner-app"></div>
</body>
</html>
