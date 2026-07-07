<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>MH Schemes - SPA</title>
    @if ($scheme)
    @php
        $initialSchemeRecord = [
            'id' => $scheme->id,
            'name' => $scheme->name,
            'description' => $scheme->description,
            'user_id' => $scheme->user_id,
            'version' => $scheme->version,
            'system_device_id' => $scheme->system_device_id,
            'incoming_scheme' => $scheme->incoming_scheme,
        ];
    @endphp
    <script>
        window.__INITIAL_SCHEME_RECORD__ = @json($initialSchemeRecord);
    </script>
    @endif
    @if (app()->environment('local'))
    <script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    @endif
    @vite(['resources/css/app.css', 'resources/js/spa.jsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
