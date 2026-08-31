import React, {
    useCallback, useEffect, useState,
} from 'react';
import logoPath from '../../assets/logo/logo.svg';
import LogoutButton from '../components/LogoutButton';
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

const LearningAccountHeader = () => (
    <header className="account-liquid-header">
        <div className="account-liquid-header-shine" aria-hidden="true" />
        <a className="account-header-brand" href="/user-schemes" aria-label="MyHeat, подбор оборудования">
            <span className="account-logo-lockup"><img src={logoPath} alt="MyHeat" /><b>PRO</b></span>
            <span>Личный кабинет</span>
        </a>
        <div className="account-header-actions">
            <div className="account-header-caption">
                <strong>Обучение</strong>
                <span>Практика подключения оборудования</span>
            </div>
            <LogoutButton />
        </div>
    </header>
);

const LearningSidebar = () => (
    <aside className="account-sidebar" aria-label="Навигация аккаунта">
        <nav className="account-navigation">
            <a href="/settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
                <span>Настройки аккаунта</span>
            </a>
            <a href="/user-schemes">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 15h.01M12 15h.01M16 15h.01" /></svg>
                <span>Созданные схемы</span>
            </a>
            <a href="/selection">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m6 0v6m-7 0v6" /></svg>
                <span>Подбор оборудования</span>
            </a>
            <a href="/cases">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 12h18M9 15l2 2 4-4" /></svg>
                <span>Выполненные работы</span>
            </a>
            <a className="is-active" href="/learning" aria-current="page">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5m0-16v16M8 7h8m-8 4h8" /></svg>
                <span>Обучение</span>
            </a>
        </nav>
    </aside>
);

const LearningLayout = ({ children }) => (
    <div className="learning-page">
        <LearningAccountHeader />
        <main className="account-shell learning-account-shell">
            <LearningSidebar />
            <section className="learning-content">{children}</section>
        </main>
    </div>
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
            <LearningLayout>
                <IntroScreen totalQuestions={TOTAL} onStart={startQuiz} />
            </LearningLayout>
        );
    }

    if (view === 'complete') {
        return (
            <LearningLayout>
                <CompleteScreen
                    solvedCount={solvedCount}
                    solvableCount={SOLVABLE_TOTAL}
                    elapsedLabel={formatElapsed(elapsedSeconds)}
                    onRestart={restart}
                    onReview={reviewQuestions}
                />
            </LearningLayout>
        );
    }

    return (
        <LearningLayout>
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
        </LearningLayout>
    );
};

export default LearningApp;
