import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';

interface UserProfilePanelProps {
  userProfile: UserProfile;
  onUserProfileChange: (profile: UserProfile) => void;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ userProfile, onUserProfileChange }) => {
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [username, setUsername] = useState(userProfile.username);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    setFullName(userProfile.fullName);
    setUsername(userProfile.username);
  }, [userProfile]);

  const hasChanges = fullName.trim() !== userProfile.fullName || username.trim() !== userProfile.username;

  const handleSave = () => {
    if (!hasChanges) return;
    setSaveState('saving');
    // Simulate save
    setTimeout(() => {
        onUserProfileChange({ fullName: fullName.trim(), username: username.trim() });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col items-center gap-2 p-4 bg-panel-header rounded-lg">
        <div className="w-20 h-20 bg-condorito-red text-white rounded-full flex items-center justify-center font-bold text-3xl select-none">
          {getInitials(fullName)}
        </div>
        <p className="font-bold text-sm text-condorito-brown">{fullName || '...'}</p>
        <p className="text-condorito-brown/70">@{username || '...'}</p>
      </div>

      <div>
        <label htmlFor="fullName" className="block font-medium text-condorito-brown mb-1">Full Name</label>
        <input
          type="text"
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red bg-white"
        />
      </div>
      <div>
        <label htmlFor="username" className="block font-medium text-condorito-brown mb-1">Username</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red bg-white"
        />
      </div>

      <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveState !== 'idle'}
            className={`w-full relative overflow-hidden font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors
              ${saveState === 'saved' ? 'bg-condorito-green text-white' : 'bg-condorito-red text-white'}
              ${!hasChanges || saveState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-95'}`}
          >
            {saveState === 'saving' && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {saveState === 'idle' && 'Save Changes'}
            {saveState === 'saving' && 'Saving...'}
            {saveState === 'saved' && 'Saved!'}
          </button>
      </div>
    </div>
  );
};

export default UserProfilePanel;