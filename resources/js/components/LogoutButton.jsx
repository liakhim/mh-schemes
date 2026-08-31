import React from 'react';

const LogoutButton = () => (
    <form className="app-logout-form" method="POST" action="/logout">
        <input
            type="hidden"
            name="_token"
            value={document.querySelector('meta[name="csrf-token"]')?.content || ''}
        />
        <button className="app-logout-button" type="submit">Выйти</button>
    </form>
);

export default LogoutButton;
