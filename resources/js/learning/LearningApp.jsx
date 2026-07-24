import React, {
    useCallback, useEffect, useState,
} from 'react';
import logoPath from '../../assets/logo/logo.svg';
import CompleteScreen from './CompleteScreen';
import DecorativeDevices from './DecorativeDevices';
import Fireworks from './Fireworks';
import IntroScreen from './IntroScreen';
import { QUESTIONS } from './questions';
import QuizCanvas from './QuizCanvas';

const TOTAL = QUESTIONS.length;
const SOLVABLE_TOTAL = QUESTIONS.filter((q) => !q.todo).length;

const isQuestionSolved = (question, solvedPairs) => {
    if (question.todo) return false;
    return !!solvedPairs && solvedPairs.size === question.pairs.length;
};

const formatElapsed = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const LearningNavbar = () => (
    <nav className="learning-navbar">
        <div className="learning-navbar-brand">
            <a href="/" className="learning-navbar-logo-link" aria-label="MyHeat — главная">
                <img src={logoPath} alt="MyHeat" className="learning-navbar-logo" />
            </a>
            <div className="learning-alpha-notice">
                <span>Приложение находится <u>в стадии альфа-тестирования</u>, все вопросы к разработчику:</span>
                <a href="https://t.me/mmingareev" target="_blank" rel="noreferrer">Telegram</a>
            </div>
        </div>
    </nav>
);

const LearningApp = () => {
    const [view, setView] = useState('intro'); // 'intro' | 'quiz' | 'complete'
    const [currentIndex, setCurrentIndex] = useState(0);
    const [solvedByQuestion, setSolvedByQuestion] = useState({});
    const [quizStartedAt, setQuizStartedAt] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [justSolvedQuestionId, setJustSolvedQuestionId] = useState(null);

    const question = QUESTIONS[currentIndex];
    const solvedPairs = solvedByQuestion[question.id] || new Set();
    const questionSolved = isQuestionSolved(question, solvedPairs);
    const solvedCount = QUESTIONS.filter((q) => isQuestionSolved(q, solvedByQuestion[q.id])).length;

    useEffect(() => {
        if (view !== 'quiz' || quizStartedAt === null) return undefined;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - quizStartedAt) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [view, quizStartedAt]);

    const handleSolvePair = useCallback((pairIndex) => {
        const willBeSolved = solvedPairs.size + 1 === question.pairs.length;
        setSolvedByQuestion((prev) => {
            const next = new Set(prev[question.id] || []);
            next.add(pairIndex);
            return { ...prev, [question.id]: next };
        });
        if (willBeSolved) setJustSolvedQuestionId(question.id);
    }, [question.id, question.pairs.length, solvedPairs]);

    const startQuiz = () => {
        setCurrentIndex(0);
        setQuizStartedAt(Date.now());
        setElapsedSeconds(0);
        setView('quiz');
    };

    const goPrev = () => {
        if (currentIndex === 0) {
            setView('intro');
            return;
        }
        setCurrentIndex((index) => index - 1);
    };

    const goNext = () => {
        if (currentIndex === TOTAL - 1) {
            setView('complete');
            return;
        }
        setCurrentIndex((index) => index + 1);
    };

    const restart = () => {
        setSolvedByQuestion({});
        setCurrentIndex(0);
        setQuizStartedAt(null);
        setElapsedSeconds(0);
        setJustSolvedQuestionId(null);
        setView('intro');
    };

    const reviewQuestions = () => {
        setCurrentIndex(TOTAL - 1);
        // Otherwise re-entering the last (already-solved) question replays its fireworks, since
        // that's still whatever question was solved to reach the complete screen in the first
        // place.
        setJustSolvedQuestionId(null);
        setView('quiz');
    };

    if (view === 'intro') {
        return (
            <div className="learning-page">
                <LearningNavbar />
                <IntroScreen totalQuestions={TOTAL} onStart={startQuiz} />
            </div>
        );
    }

    if (view === 'complete') {
        return (
            <div className="learning-page">
                <LearningNavbar />
                <CompleteScreen
                    solvedCount={solvedCount}
                    solvableCount={SOLVABLE_TOTAL}
                    elapsedLabel={formatElapsed(elapsedSeconds)}
                    onRestart={restart}
                    onReview={reviewQuestions}
                />
            </div>
        );
    }

    return (
        <div className="learning-page">
            <LearningNavbar />
            <header className="learning-header">
                <div className="learning-header-top">
                    <div className="learning-title">Обучение — вопрос {currentIndex + 1} из {TOTAL}</div>
                    <div className="learning-timer" title="Время с начала обучения">⏱ {formatElapsed(elapsedSeconds)}</div>
                </div>
                <div className="learning-progress">
                    {QUESTIONS.map((q, idx) => {
                        const solved = isQuestionSolved(q, solvedByQuestion[q.id]);
                        const classes = ['learning-progress-segment'];
                        if (idx === currentIndex) classes.push('is-current');
                        if (solved) classes.push('is-solved');
                        return (
                            <button
                                key={q.id}
                                type="button"
                                className={classes.join(' ')}
                                title={q.title}
                                onClick={() => setCurrentIndex(idx)}
                            />
                        );
                    })}
                </div>
            </header>

            <main className="learning-main">
                <Fireworks active={justSolvedQuestionId === question.id} />
                <div key={question.id} className="learning-fade">
                    {question.todo ? (
                        <div className="learning-todo">
                            <h2>{question.title}</h2>
                            <p>Вопрос в разработке</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="learning-question-title">{question.title}</h2>
                            {question.decorativeDevices && (
                                <DecorativeDevices devices={question.decorativeDevices} enabled={questionSolved} />
                            )}
                            {questionSolved && (
                                <div className="learning-success-banner">✓ Все соединения выполнены верно</div>
                            )}
                            <QuizCanvas
                                question={question}
                                solvedPairs={solvedPairs}
                                onSolvePair={handleSolvePair}
                            />
                        </>
                    )}
                </div>
            </main>

            <footer className="learning-nav">
                <button type="button" onClick={goPrev}>← Предыдущий</button>
                <button type="button" onClick={goNext}>
                    {currentIndex === TOTAL - 1 ? 'Завершить →' : 'Следующий →'}
                </button>
            </footer>
        </div>
    );
};

export default LearningApp;
