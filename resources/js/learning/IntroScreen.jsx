import React from 'react';

const IntroScreen = ({ totalQuestions, onStart }) => (
    <div className="learning-cover">
        <div className="learning-cover-card">
            <h1>Обучение коммутации оборудования</h1>
            <p>
                Потренируйтесь правильно соединять контроллеры, модули и датчики MyHeat.
                Впереди {totalQuestions} практических вопросов: кликните порт на одном
                устройстве, затем на другом — если пара верна, появится соединительная линия,
                если нет — порты подсветятся красным.
            </p>
            <button type="button" className="learning-cover-button" onClick={onStart}>
                Начать обучение →
            </button>
        </div>
    </div>
);

export default IntroScreen;
