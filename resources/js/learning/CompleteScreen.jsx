import React from 'react';

const CompleteScreen = ({
    solvedCount, solvableCount, elapsedLabel, onRestart, onReview,
}) => (
    <div className="learning-cover">
        <div className="learning-cover-card">
            <h1>🎉 Поздравляем!</h1>
            <p>Вы прошли все вопросы обучения по коммутации оборудования.</p>
            <p className="learning-cover-stats">
                Решено верно: {solvedCount} из {solvableCount}
            </p>
            {elapsedLabel && (
                <p className="learning-cover-stats">
                    Время прохождения: {elapsedLabel}
                </p>
            )}
            <div className="learning-cover-actions">
                <button type="button" className="learning-cover-button" onClick={onRestart}>
                    Пройти заново
                </button>
                <button type="button" className="learning-cover-button learning-cover-button--ghost" onClick={onReview}>
                    Вернуться к вопросам
                </button>
            </div>
        </div>
    </div>
);

export default CompleteScreen;
