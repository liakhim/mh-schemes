import React, { useCallback, useState } from 'react';
import CompleteScreen from './CompleteScreen';
import DecorativeDevices from './DecorativeDevices';
import IntroScreen from './IntroScreen';
import { QUESTIONS } from './questions';
import QuizCanvas from './QuizCanvas';

const TOTAL = QUESTIONS.length;
const SOLVABLE_TOTAL = QUESTIONS.filter((q) => !q.todo).length;

const isQuestionSolved = (question, solvedPairs) => {
    if (question.todo) return false;
    return !!solvedPairs && solvedPairs.size === question.pairs.length;
};

const LearningApp = () => {
    const [view, setView] = useState('intro'); // 'intro' | 'quiz' | 'complete'
    const [currentIndex, setCurrentIndex] = useState(0);
    const [solvedByQuestion, setSolvedByQuestion] = useState({});

    const question = QUESTIONS[currentIndex];
    const solvedPairs = solvedByQuestion[question.id] || new Set();
    const questionSolved = isQuestionSolved(question, solvedPairs);
    const solvedCount = QUESTIONS.filter((q) => isQuestionSolved(q, solvedByQuestion[q.id])).length;

    const handleSolvePair = useCallback((pairIndex) => {
        setSolvedByQuestion((prev) => {
            const next = new Set(prev[question.id] || []);
            next.add(pairIndex);
            return { ...prev, [question.id]: next };
        });
    }, [question.id]);

    const startQuiz = () => {
        setCurrentIndex(0);
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
        setView('intro');
    };

    const reviewQuestions = () => {
        setCurrentIndex(TOTAL - 1);
        setView('quiz');
    };

    if (view === 'intro') {
        return (
            <div className="learning-page">
                <IntroScreen totalQuestions={TOTAL} onStart={startQuiz} />
            </div>
        );
    }

    if (view === 'complete') {
        return (
            <div className="learning-page">
                <CompleteScreen
                    solvedCount={solvedCount}
                    solvableCount={SOLVABLE_TOTAL}
                    onRestart={restart}
                    onReview={reviewQuestions}
                />
            </div>
        );
    }

    return (
        <div className="learning-page">
            <header className="learning-header">
                <div className="learning-title">Обучение — вопрос {currentIndex + 1} из {TOTAL}</div>
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
