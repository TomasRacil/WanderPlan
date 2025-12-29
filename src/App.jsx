import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Settings, Plane, Home, Wallet, CheckSquare, Calendar, Map as MapIcon, Loader, Globe, ArrowDownCircle, RefreshCw
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react'

import { COLORS } from './data/uiConstants';
import {
  setActiveTab, setShowSettings, loadFullTrip, setApiKey, generateTrip, setLanguage, initializeTrip, setSelectedModel, clearQuotaError
} from './store/tripSlice';
import { AVAILABLE_MODELS, logAvailableModels } from './services/gemini';
import { set } from 'idb-keyval';
import JSZip from 'jszip';
import { Overview } from './components/Overview';
import { PreTripTasks } from './components/PreTripTasks';
import { PackingList } from './components/PackingList';
import { Itinerary } from './components/Itinerary';
import { Budget } from './components/Budget';
import { Map } from './components/Map';
import { LOCALES } from './i18n/locales';
import { Button } from './components/CommonUI';
import { ReviewModal } from './components/ReviewModal';
import { ErrorModal } from './components/ErrorModal';

function WanderPlanContent() {
  const dispatch = useDispatch();
  const { tripDetails, expenses, itinerary, preTripTasks, apiKey, customPrompt, packingList, phrasebook, exchangeRates, isInitialized, selectedModel, distilledContext } = useSelector(state => state.trip);
  const activeTab = useSelector(state => state.trip.activeTab);
  const showSettings = useSelector(state => state.trip.showSettings);
  const loading = useSelector(state => state.trip.loading);
  const language = useSelector(state => state.trip.language || 'en');
  const t = LOCALES[language];

  // PWA Update
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Local Nano Availability Check
  const [hasNano, setHasNano] = React.useState(false);
  React.useEffect(() => {
    // Check if window.ai is available (Chrome Canary/Dev experimental)
    if (window.ai && window.ai.languageModel) {
      setHasNano(true);
    }
  }, []);


  // Auto-save to localStorage on change (Initial load handled in tripSlice)

  // Auto-save to IndexedDB on change
  React.useEffect(() => {
    if (!isInitialized) return;
    const tripData = { tripDetails, preTripTasks, itinerary, expenses, packingList, phrasebook, exchangeRates, language, selectedModel, distilledContext };
    set('wanderplan_current_trip', tripData).catch(err => console.error('Auto-save failed', err));
  }, [tripDetails, preTripTasks, itinerary, expenses, packingList, phrasebook, exchangeRates, language, isInitialized, selectedModel, distilledContext]);

  React.useEffect(() => {
    dispatch(initializeTrip());
  }, [dispatch]);

  // React.useEffect(() => {
  //   if (apiKey) {
  //     logAvailableModels(apiKey);
  //   }
  // }, [apiKey]);

  const handleSaveTrip = async () => {
    const tripData = {
      version: 5,
      timestamp: new Date().toISOString(),
      tripDetails,
      preTripTasks,
      itinerary,
      expenses,
      packingList,
      phrasebook,
      exchangeRates,
      language,
      selectedModel,
      distilledContext
    };

    try {
      const zip = new JSZip();
      zip.file("trip_data.json", JSON.stringify(tripData, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
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

  const handleLoadTrip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(file);
        const jsonFile = unzipped.file("trip_data.json");
        if (jsonFile) {
          const content = await jsonFile.async("string");
          dispatch(loadFullTrip(JSON.parse(content)));
          alert("Trip archive loaded successfully!");
        } else {
          alert("Invalid archive: trip_data.json not found.");
        }
      } else {
        // Fallback for legacy JSON support
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            dispatch(loadFullTrip(JSON.parse(event.target.result)));
            alert("Trip loaded successfully!");
          } catch (error) {
            alert("Failed to load trip file.");
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Failed to load archive", error);
      alert("Failed to load trip archive.");
    }
    e.target.value = '';
  };

  const navItems = [
    { id: 'overview', icon: Home, label: t.overview },
    { id: 'tasks', icon: CheckSquare, label: t.tasks },
    { id: 'packing', icon: Plane, label: t.packing },
    { id: 'itinerary', icon: Calendar, label: t.itinerary },
    { id: 'budget', icon: Wallet, label: t.budget },
    { id: 'map', icon: MapIcon, label: t.map },
  ];

  return (
    <div className={`h-screen flex flex-col ${COLORS.bg} text-slate-800 font-sans selection:bg-indigo-100 overflow-hidden`}>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-indigo-600" />
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">WanderPlan</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {navItems.map((item) => (
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

          <div className="flex items-center gap-4">
            {/* PWA Update Toast (Desktop/Mobile) - minimal indicator or rely on settings? 
                 Let's add a small indicator if update is ready */}
            {needRefresh && (
              <button onClick={() => updateServiceWorker(true)} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold animate-pulse hover:bg-indigo-200">
                <ArrowDownCircle size={14} /> <span className="hidden sm:inline">Update</span>
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

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-auto flex flex-col pb-24 md:pb-6">
        {activeTab === 'overview' && (
          <Overview
            onSave={handleSaveTrip}
            onLoad={handleLoadTrip}
          />
        )}
        {activeTab === 'budget' && <Budget />}
        {activeTab === 'tasks' && <PreTripTasks />}
        {activeTab === 'packing' && <PackingList />}
        {activeTab === 'itinerary' && <Itinerary />}
        {activeTab === 'map' && <Map />}
      </main>

      {/* Review Modal for AI Changes */}
      <ReviewModal />

      {/* Error Modal for Quota Limits */}
      <ErrorModal
        error={useSelector(state => state.trip.quotaError)}
        onClose={() => dispatch(clearQuotaError())}
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
            <p className="text-sm text-slate-500">This may take a few seconds.</p>
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
              placeholder="Gemini API Key"
              className="w-full p-2 border rounded-lg mb-4 text-sm"
            />

            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">AI Model</h3>
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
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Language</h3>
              <div className="flex gap-2">
                <button onClick={() => dispatch(setLanguage('en'))} className={`flex-1 py-2 text-sm font-bold rounded-lg border ${language === 'en' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>English</button>
                <button onClick={() => dispatch(setLanguage('cs'))} className={`flex-1 py-2 text-sm font-bold rounded-lg border ${language === 'cs' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>Čeština</button>
              </div>
            </div>

            {/* PWA Manual Update */}
            {needRefresh && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-indigo-800">Update Available</p>
                  <p className="text-xs text-indigo-600">A new version of the app is ready.</p>
                </div>
                <Button onClick={() => updateServiceWorker(true)} icon={RefreshCw} className="py-1 px-3 text-xs">
                  Update
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => dispatch(setShowSettings(false))}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WanderPlan() {
  return <WanderPlanContent />;
}