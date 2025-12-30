import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Calendar, CheckSquare, Sparkles, Wallet, Save, Download, Upload, Languages } from 'lucide-react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { generateTrip } from '../store/tripSlice';
import { setActiveTab } from '../store/uiSlice';
import { setTasks as setPreTripTasks } from '../store/resourceSlice';
import { calculateBudgetTotals, formatMoney, parseCost } from '../utils/helpers';
import { LOCALES } from '../i18n/locales';

// Sub-components
import { TripHeader } from './overview/TripHeader';
import { TripSettingsCard } from './overview/TripSettingsCard';

export const Overview = ({ onSave, onLoad }) => {
  const dispatch = useDispatch();
  const { tripDetails, expenses, exchangeRates = {} } = useSelector(state => state.trip);
  const { items: itinerary } = useSelector(state => state.itinerary);
  const { tasks: preTripTasks, phrasebook } = useSelector(state => state.resources);
  const { loading, language: languageCode } = useSelector(state => state.ui);
  const language = languageCode || 'en';
  const t = LOCALES[language];

  const budgetTotals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails, exchangeRates);
  const isUnlimited = tripDetails.budget === 'Unlimited';
  const totalBudget = isUnlimited ? 0 : (parseCost(tripDetails.budget) || 1);
  const percentage = isUnlimited ? 0 : Math.min(100, (budgetTotals.totalSpent / totalBudget) * 100);

  // Auto-refresh timer to update "Now" for focus logic
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const upcomingEvents = [...itinerary]
    .sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')))
    .filter(e => new Date(e.startDate + ' ' + (e.startTime || '00:00')) >= now)
    .slice(0, 3);

  // Focus Item Logic: Find the single most urgent thing (Task or Event)
  const nextTask = [...preTripTasks].filter(t => !t.done).sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  })[0];

  const nextEvent = upcomingEvents[0];

  let focusItem = null;
  if (nextTask && nextEvent) {
    const taskDate = new Date(nextTask.deadline + 'T23:59:59'); // Assume end of day for tasks
    const eventDate = new Date(nextEvent.startDate + ' ' + (nextEvent.startTime || '00:00'));
    focusItem = taskDate <= eventDate ? { ...nextTask, type: 'task' } : { ...nextEvent, type: 'event' };
  } else if (nextTask) {
    focusItem = { ...nextTask, type: 'task' };
  } else if (nextEvent) {
    focusItem = { ...nextEvent, type: 'event' };
  }

  const pendingTasks = [...preTripTasks]
    .filter(t => !t.done)
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, 3);

  // Basic markdown parser for bold (**) and italic (*)
  const renderMarkdown = (text) => {
    if (!text) return null;

    const parts = text.split(/(\*\*.*?\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-emerald-800">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-emerald-700">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <TripHeader tripDetails={tripDetails} t={t} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {focusItem && (
            <Card className="p-5 border-l-4 border-l-indigo-500 bg-indigo-50/30 backdrop-blur-sm shadow-sm flex items-center gap-4 group">
              <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-indigo-200 shadow-lg">
                {focusItem.type === 'task' ? <CheckSquare size={24} /> : <Calendar size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="hidden md:inline-block text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{t.nextFocus || "Your Next Priority"}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 truncate">{focusItem.text || focusItem.title}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="font-medium">
                      {focusItem.type === 'task'
                        ? (focusItem.deadline ? new Date(focusItem.deadline).toLocaleDateString() : 'No date')
                        : `${new Date(focusItem.startDate).toLocaleDateString()} @ ${focusItem.startTime}`}
                    </span>
                  </div>
                </div>
              </div>

              {focusItem.type === 'task' && (
                <button
                  onClick={() => dispatch(setPreTripTasks(preTripTasks.map(t => t.id === focusItem.id ? { ...t, done: true } : t)))}
                  className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors group/btn"
                  title={t.allDone}
                >
                  <CheckSquare size={20} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              )}

              <Button
                variant="secondary"
                className="hidden md:flex text-xs h-9 px-4"
                onClick={() => dispatch(setActiveTab(focusItem.type === 'task' ? 'tasks' : 'itinerary'))}
              >
                {t.viewAll}
              </Button>
            </Card>
          )}

          <TripSettingsCard tripDetails={tripDetails} t={t} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-slate-200 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" /> {t.highlights || "Highlights"}
                </h4>
                <button onClick={() => dispatch(setActiveTab('itinerary'))} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider">{t.viewAll || "View All"}</button>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0`}>
                      <Calendar size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{event.title}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{event.startTime}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    {t.noUpcomingEvents || "No upcoming events"}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <CheckSquare size={16} className="text-amber-500" /> {t.pendingTasks || "Pending Tasks"}
                </h4>
                <button onClick={() => dispatch(setActiveTab('tasks'))} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wider">{t.viewAll || "View All"}</button>
              </div>
              <div className="space-y-3">
                {pendingTasks.length > 0 ? pendingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0`}>
                      <CheckSquare size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{task.text}</div>
                      {task.deadline && (
                        <div className="text-[10px] text-amber-600 font-medium">Due: {new Date(task.deadline).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    {t.allDone || "All tasks complete!"}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Wallet size={16} className="text-indigo-600" /> {t.budget_title}</h4>
              <button onClick={() => dispatch(setActiveTab('budget'))} className="text-xs text-indigo-600 hover:underline">{t.manage}</button>
            </div>
            <div className="text-xs text-slate-500">{t.spent}: <span className="font-bold text-slate-700">{formatMoney(budgetTotals.totalSpent, tripDetails.homeCurrency)}</span></div>
            {!isUnlimited && (
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${budgetTotals.remaining < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            )}
            {isUnlimited && <div className="text-xs text-emerald-600 font-bold mt-2 uppercase tracking-wider">{t.unlimitedBudget}</div>}
          </Card>




          {phrasebook ? (
            <Card className="p-5 bg-emerald-50 border-emerald-100 group relative shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-emerald-100/50 pb-2">
                <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                  <Languages size={14} className="text-emerald-600" /> {phrasebook.language}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => dispatch(generateTrip({ targetArea: 'phrasebook' }))}
                    className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-md transition-all"
                    title={t.refreshPhrases}
                    disabled={loading}
                  >
                    <Sparkles size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {phrasebook.phrases?.map((p, idx) => (
                  <div key={idx} className="bg-white/60 p-2.5 rounded-lg border border-emerald-100/50 hover:bg-white transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-emerald-900 text-sm">{p.original}</span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-100/50 px-1.5 py-0.5 rounded">{p.english}</span>
                    </div>
                    {p.phonetic && p.phonetic !== '-' && (
                      <p className="text-[11px] text-emerald-600 font-medium italic">"{p.phonetic}"</p>
                    )}
                  </div>
                ))}
              </div>

              {phrasebook.tips && (
                <div className="mt-4 pt-3 border-t border-emerald-100">
                  <p className="text-[11px] text-emerald-700/80 leading-relaxed flex gap-1 flex-wrap">
                    <span className="font-bold shrink-0 text-emerald-800">Tips:</span>
                    <span>{renderMarkdown(phrasebook.tips)}</span>
                  </p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4 bg-slate-50 border-slate-200">
              <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                <Languages size={14} /> Phrasebook
              </h4>
              <Button
                variant="secondary"
                className="w-full text-xs h-8"
                onClick={() => dispatch(generateTrip({ targetArea: 'phrasebook' }))}
                loading={loading}
                icon={Sparkles}
              >
                {t.generatePhrases}
              </Button>
            </Card>
          )}
        </div>
      </div >
    </div >
  );
};