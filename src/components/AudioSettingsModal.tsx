import React from 'react';
import { AudioAlertConfig } from '../types.ts';
import { playAlertChime } from '../utils/format.ts';
import { Volume2, VolumeX, X, Bell, Shield, Droplets } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AudioAlertConfig;
  onUpdateConfig: (updates: Partial<AudioAlertConfig>) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#0e1115] border border-[#232832] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232832]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Launch Alert Audio Settings</h3>
              <p className="text-[11px] text-slate-400">Configure radar audio chime for incoming launches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#14171d] border border-[#232832]">
          <div className="flex items-center gap-2.5">
            {config.enabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <div className="text-xs font-bold text-white">Audio Radar Chimes</div>
              <div className="text-[10px] text-slate-400">Play acoustic alert chime on new token release</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ enabled: !config.enabled })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              config.enabled
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {config.enabled ? 'ENABLED' : 'MUTED'}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="p-3 rounded-xl bg-[#14171d] border border-[#232832] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Alert Volume</span>
            <span className="font-mono text-amber-400 font-bold">{Math.round(config.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={config.volume}
            disabled={!config.enabled}
            onChange={e => onUpdateConfig({ volume: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
          />
        </div>

        {/* Trigger Filter Options */}
        <div className="p-3 rounded-xl bg-[#14171d] border border-[#232832] space-y-2.5">
          <div className="text-xs font-semibold text-slate-300">Audio Trigger Criteria</div>
          <div className="space-y-1.5">
            <button
              onClick={() => onUpdateConfig({ filter: 'all' })}
              className={`w-full p-2 rounded-lg text-left text-xs font-medium border transition-all flex items-center justify-between ${
                config.filter === 'all'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-[#0e1115] text-slate-400 border-[#232832] hover:text-white'
              }`}
            >
              <div>
                <span className="font-bold block">🔔 All New Launches</span>
                <span className="text-[10px] text-slate-400">Ring for any newly indexed token launch</span>
              </div>
              {config.filter === 'all' && <span className="text-amber-400 font-bold text-xs">✓ Active</span>}
            </button>

            <button
              onClick={() => onUpdateConfig({ filter: 'liq500' })}
              className={`w-full p-2 rounded-lg text-left text-xs font-medium border transition-all flex items-center justify-between ${
                config.filter === 'liq500'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#0e1115] text-slate-400 border-[#232832] hover:text-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <Droplets className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-bold block">💧 Liquid Only (Liq &gt; $500)</span>
                  <span className="text-[10px] text-slate-400">Ignore zero-liquidity or spam launches</span>
                </div>
              </div>
              {config.filter === 'liq500' && <span className="text-emerald-400 font-bold text-xs">✓ Active</span>}
            </button>

            <button
              onClick={() => onUpdateConfig({ filter: 'singleDev' })}
              className={`w-full p-2 rounded-lg text-left text-xs font-medium border transition-all flex items-center justify-between ${
                config.filter === 'singleDev'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                  : 'bg-[#0e1115] text-slate-400 border-[#232832] hover:text-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <span className="font-bold block">🛡️ Single-Dev Only</span>
                  <span className="text-[10px] text-slate-400">Filter out repeat &amp; serial farm deployers</span>
                </div>
              </div>
              {config.filter === 'singleDev' && <span className="text-blue-400 font-bold text-xs">✓ Active</span>}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => playAlertChime(config.volume)}
            className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#14171d] border border-[#232832] text-amber-400 hover:text-white hover:border-amber-500/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Test Chime 🔔</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
