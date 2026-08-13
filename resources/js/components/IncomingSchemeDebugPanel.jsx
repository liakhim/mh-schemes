const IncomingSchemeDebugPanel = ({
    text,
    dirty,
    error,
    onTextChange,
    onRender,
    onFormat,
}) => (
    <div className="spa-debug-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>incomingScheme</strong>
            {dirty && <span style={{ color: '#b26a00', fontSize: 12 }}>изменено</span>}
        </div>
        <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            spellCheck={false}
            style={{
                width: '100%',
                height: 500,
                resize: 'vertical',
                border: '1px solid #d7dbe4',
                borderRadius: 6,
                padding: 8,
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: 11,
                lineHeight: 1.45,
                color: '#202738',
                background: '#f8fafc',
            }}
        />
        {error && (
            <div style={{ marginTop: 6, color: '#c62828', fontSize: 12 }}>
                {error}
            </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onRender} style={{ padding: '7px 12px' }}>
                Рендер
            </button>
            <button type="button" onClick={onFormat} style={{ padding: '7px 12px' }}>
                Форматировать
            </button>
        </div>
    </div>
);

export default IncomingSchemeDebugPanel;
