import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Settings, Plane, Home, Wallet, CheckSquare, Calendar, Map as MapIcon, Loader, Globe, ArrowDownCircle, RefreshCw, FileText, ChevronLeft
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react'

import { COLORS } from './data/uiConstants';
import {
  setActiveTab, setShowSettings, setLanguage, clearQuotaError, clearAiError
} from './store/uiSlice';
import {
  loadFullTrip, setApiKey, generateTrip, initializeTrip, setSelectedModel, loadSelectedTrip
} from './store/tripSlice';
import { AVAILABLE_MODELS, logAvailableModels } from './services/gemini';
import { storage } from './services/storage'; // Updated import
import { exportTripToZip } from './utils/exportImport';
import JSZip from 'jszip';
import { Overview } from './components/Overview';
import { PreTripTasks } from './components/PreTripTasks';
import { PackingList } from './components/PackingList';
import { Itinerary } from './components/Itinerary';
import { Budget } from './components/Budget';
import { Map } from './components/Map';
import { Dashboard } from './components/Dashboard'; // New Component
import { LOCALES } from './i18n/locales';
import { Button } from './components/common/Button';
import { ReviewModal } from './components/common/ReviewModal';
import { ErrorModal } from './components/common/ErrorModal';
import { DocumentManagerModal } from './components/common/DocumentManagerModal';
import { getNavItems } from './config/navigation';

function WanderPlanContent() {
  const dispatch = useDispatch();
  const { tripDetails, expenses, apiKey, exchangeRates, selectedModel } = useSelector(state => state.trip);
  const { items: itinerary } = useSelector(state => state.itinerary);
  const { list: packingList, bags } = useSelector(state => state.packing);
  const { tasks: preTripTasks, documents, distilledContext, phrasebook } = useSelector(state => state.resources);
  const { activeTab, showSettings, loading, language, quotaError, aiError, isInitialized } = useSelector(state => state.ui);
  const t = LOCALES[language];

  // Router-like state
  const [viewMode, setViewMode] = React.useState('dashboard'); // 'dashboard' | 'trip'

  // PWA Update
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [showDocs, setShowDocs] = React.useState(false);

  // Local Nano Availability Check
  const [hasNano, setHasNano] = React.useState(false);
  React.useEffect(() => {
    if (window.ai && window.ai.languageModel) {
      setHasNano(true);
    }
  }, []);

  // Initialize
  React.useEffect(() => {
    dispatch(initializeTrip());
  }, [dispatch]);

  // Auto-save specific trip to IndexedDB
  React.useEffect(() => {
    if (!isInitialized || viewMode !== 'trip') return;

    // Safety check: ensure we have an ID
    if (!tripDetails.id) return;

    // Construct full state object matching the schema expected by migration/load
    const tripData = {
      trip: {
        tripDetails, expenses, exchangeRates, apiKey, selectedModel, customPrompt: '', proposedChanges: null
      },
      resources: {
        // Use 'preTripTasks' for legacy compatibility or 'tasks' for new schema?
        // Migration expects 'tasks' in resources for new format, or 'preTripTasks' in root for old.
        // Let's stick to the slice structure: resources.tasks = preTripTasks
        tasks: preTripTasks,
        documents,
        distilledContext,
        phrasebook
      },
      itinerary: { items: itinerary },
      packing: {
        list: packingList,
        bags: bags || [] // Ensure bags are included
      },
      ui: { language }
    };

    const save = async () => {
      try {
        console.log("Auto-saving trip...", tripDetails.id, "Tasks:", preTripTasks?.length, "Bags:", bags?.length);
        await storage.saveTrip(tripData);
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    };

    // Debounce slightly or just run
    const timer = setTimeout(save, 1000);
    return () => clearTimeout(timer);

  }, [tripDetails, preTripTasks, itinerary, expenses, packingList, bags, phrasebook, exchangeRates, language, isInitialized, selectedModel, distilledContext, documents, viewMode]);


  const handleSaveTrip = async () => {
    // Should match the structure above for consistency, or use the exact same object construction
    const tripData = {
      version: 5,
      timestamp: new Date().toISOString(),
      trip: {
        tripDetails, expenses, exchangeRates, apiKey, selectedModel, customPrompt: '', proposedChanges: null
      },
      resources: {
        tasks: preTripTasks,
        documents,
        distilledContext,
        phrasebook
      },
      itinerary: { items: itinerary },
      packing: {
        list: packingList,
        bags: bags || []
      },
      ui: { language }
    };

    try {
      const content = await exportTripToZip(tripData);
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wanderplan-${tripDetails.destination || 'trip'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip trip", error);
      alert("Failed to create backup archive.");
    }
  };

  const handleTripSelect = (id) => {
    setViewMode('trip');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
  };

  const navItems = getNavItems(t);

  return (
    <div className={`h-screen flex flex-col ${COLORS.bg} text-slate-800 font-sans selection:bg-indigo-100 overflow-hidden`}>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {viewMode === 'trip' && (
              <button
                onClick={handleBackToDashboard}
                className="p-1 hover:bg-slate-100 rounded-full mr-1 transition-colors text-slate-500"
                title={t.dashboard || "Dashboard"} // Use localized fallback
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <Globe className="text-indigo-600 hidden sm:block" />
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-none">
              {viewMode === 'trip' ? (tripDetails.destination || 'WanderPlan') : 'WanderPlan'}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {viewMode === 'trip' && navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => dispatch(setActiveTab(item.id))}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${activeTab === item.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'
                  }`}
              >
                {t[item.id]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {needRefresh && (
              <button onClick={() => updateServiceWorker(true)} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold animate-pulse hover:bg-indigo-200">
                <ArrowDownCircle size={14} /> <span className="hidden sm:inline">{t.update}</span>
              </button>
            )}

            <div className="hidden sm:flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => dispatch(setLanguage('en'))} className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>EN</button>
              <button onClick={() => dispatch(setLanguage('cs'))} className={`px-2 py-1 text-xs font-bold rounded ${language === 'cs' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>CS</button>
            </div>
            <button onClick={() => dispatch(setShowSettings(true))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <Dashboard onTripSelect={handleTripSelect} />
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-auto flex flex-col pb-24 md:pb-6">
          {activeTab === 'overview' && (
            <Overview
              onSave={handleSaveTrip}
              onLoad={(e) => alert("Please import trips from the Dashboard.")}
            />
          )}
          {activeTab === 'budget' && <Budget />}
          {activeTab === 'tasks' && <PreTripTasks />}
          {activeTab === 'packing' && <PackingList />}
          {activeTab === 'itinerary' && <Itinerary />}
          {activeTab === 'map' && <Map />}
        </main>
      )}

      {/* Review Modal for AI Changes */}
      <ReviewModal />

      {/* Error Modal for Quota Limits and AI Failures */}
      <ErrorModal
        error={quotaError || aiError}
        onClose={() => {
          if (quotaError) dispatch(clearQuotaError());
          if (aiError) dispatch(clearAiError());
        }}
        t={t}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-50 flex justify-between items-center safe-area-pb">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => dispatch(setActiveTab(item.id))}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <Loader className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-lg font-bold text-slate-700">{t.generating}</p>
            <p className="text-sm text-slate-500">{t.generatingSub}</p>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{t.settings}</h2>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => dispatch(setApiKey(e.target.value))}
              placeholder={t.geminiApiKey || "Gemini API Key"}
              className="w-full p-2 border rounded-lg mb-4 text-sm"
            />

            <button
              onClick={() => { setShowDocs(true); dispatch(setShowSettings(false)); }}
              className="w-full mb-4 flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              <FileText size={16} />
              {t.manageDocuments || "Manage Documents"}
            </button>

            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t.aiModel}</h3>
              <select
                value={selectedModel}
                onChange={(e) => dispatch(setSelectedModel(e.target.value))}
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                {Object.keys(AVAILABLE_MODELS)
                  .filter(k => AVAILABLE_MODELS[k].type === 'cloud' || (k === 'local-nano' && hasNano))
                  .map(modelKey => (
                    <option key={modelKey} value={modelKey}>
                      {modelKey} {modelKey === 'local-nano' ? '(Local)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{t.language || "Language"}</h3>
              <div className="flex gap-2">
                <button onClick={() => dispatch(setLanguage('en'))} className={`flex-1 py-2 text-sm font-bold rounded-lg border ${language === 'en' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>English</button>
                <button onClick={() => dispatch(setLanguage('cs'))} className={`flex-1 py-2 text-sm font-bold rounded-lg border ${language === 'cs' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>Čeština</button>
              </div>
            </div>

            {/* PWA Manual Update */}
            {needRefresh && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-indigo-800">{t.updateAvailable}</p>
                  <p className="text-xs text-indigo-600">{t.pwaUpdateMsg}</p>
                </div>
                <Button onClick={() => updateServiceWorker(true)} icon={RefreshCw} className="py-1 px-3 text-xs">
                  {t.update}
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => dispatch(setShowSettings(false))}>{t.close}</Button>
            </div>
          </div>
        </div>
      )}

      <DocumentManagerModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />
    </div>
  );
}

export default function WanderPlan() {
  return <WanderPlanContent />;
}