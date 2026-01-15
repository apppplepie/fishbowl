'use client';

const { Title, Text } = Typography;
import React from 'react';
import { Tab, User, Notification } from '../types';
import { GlassCard } from './GlassCard';
import { 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Key, 
  User as UserIcon, 
  Bell, 
  ChevronDown 
} from 'lucide-react';

interface ContentAreaProps {
  activeTab: Tab | null;
  onTabChange: (tab: Tab | null) => void;
  user: User;
  notification: Notification;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ activeTab, onTabChange, user, notification }) => {
  
  const toggleTab = (tab: Tab) => {
    if (activeTab === tab) {
      onTabChange(null);
    } else {
      onTabChange(tab);
    }
  };

  const sections = [
    {
      id: Tab.PROFILE,
      label: 'Profile',
      icon: UserIcon,
      summary: `@${user.handle}`,
      content: (
        <div className="space-y-8 pt-4">
           {/* Profile Content */}
           <div className="flex flex-col items-center">
              <h2 className="text-2xl font-serif text-gray-800">{user.name}</h2>
              <p className="text-sm text-gray-400 uppercase tracking-wider mt-1">{user.role}</p>
           </div>

           {/* Stats */}
           <div className="grid grid-cols-2 gap-4">
               <div className="p-5 rounded-2xl bg-white/40 border border-white/50 text-center">
                  <span className="block text-2xl font-serif text-gray-800">142</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Projects</span>
               </div>
               <div className="p-5 rounded-2xl bg-white/40 border border-white/50 text-center">
                  <span className="block text-2xl font-serif text-gray-800">3.4k</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Followers</span>
               </div>
           </div>

           {/* Bio and Email */}
           <div className="space-y-6 px-2">
              <div className="space-y-1">
                 <label className="text-xs uppercase tracking-wider text-gray-400">Bio</label>
                 <p className="text-gray-600 font-light leading-relaxed">
                   Digital explorer and interface enthusiast. Cultivating digital gardens and crafting ethereal experiences.
                 </p>
              </div>
              <div className="space-y-1">
                 <label className="text-xs uppercase tracking-wider text-gray-400">Email</label>
                 <p className="text-gray-700">hello@{user.handle}.io</p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: Tab.NOTIFICATIONS,
      label: 'Notifications',
      icon: Bell,
      summary: '1 New',
      content: (
        <div className="pt-4 h-full flex flex-col">
             <div className="relative overflow-hidden rounded-2xl bg-white/40 border border-white/60 p-6 transition-all hover:bg-white/50 flex-1">
                <div className="flex gap-5 items-start">
                   <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-700">{notification.user}</span>
                        <span className="text-gray-400 text-xs">replied</span>
                      </div>
                      <p className="text-gray-600 font-serif italic mb-3 text-sm leading-relaxed">"{notification.action}"</p>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-400">
                        <span>{notification.context}</span>
                        <span>• {notification.time}</span>
                      </div>
                   </div>
                </div>
             </div>
             <button className="w-full mt-4 text-xs text-center text-gray-400 hover:text-gray-600 transition-colors py-2">
               View History
             </button>
        </div>
      )
    },
    {
      id: Tab.PERMISSIONS,
      label: 'Access',
      icon: ShieldCheck,
      summary: user.role,
      content: (
        <div className="space-y-6 pt-4 h-full flex flex-col justify-center">
            <div className="p-6 rounded-2xl bg-amber-50/40 border border-amber-100/40 flex items-center justify-between">
              <div>
                 <h3 className="text-gray-800 font-medium mb-1">Current Plan</h3>
                 <p className="text-gray-500 text-sm">You are a <span className="font-serif italic text-amber-700">{user.role}</span>.</p>
              </div>
              <ShieldCheck size={24} className="text-amber-400/80" />
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg mb-1">Cultivator</h3>
                    <p className="text-gray-400 text-xs font-light">Unlock private sanctuaries.</p>
                  </div>
                  <button className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition-colors border border-white/10">
                    Upgrade
                  </button>
                </div>
            </div>
        </div>
      )
    },
    {
      id: Tab.SECURITY,
      label: 'Security',
      icon: Key,
      summary: 'High',
      content: (
         <div className="space-y-3 pt-4 h-full flex flex-col">
            <button className="w-full p-4 rounded-2xl bg-white/40 border border-white/50 flex items-center justify-between hover:bg-white/60 transition-colors group">
               <div className="flex items-center gap-3">
                  <Key size={18} className="text-gray-400 group-hover:text-gray-600" />
                  <div className="text-left">
                     <span className="block text-sm font-medium text-gray-700">Password</span>
                     <span className="block text-[10px] text-gray-400 uppercase tracking-wide">Last changed 90d ago</span>
                  </div>
               </div>
               <ArrowRight size={16} className="text-gray-300" />
            </button>

            <button className="w-full p-4 rounded-2xl bg-white/40 border border-white/50 flex items-center justify-between hover:bg-white/60 transition-colors group">
               <div className="flex items-center gap-3">
                  <Clock size={18} className="text-gray-400 group-hover:text-gray-600" />
                  <div className="text-left">
                     <span className="block text-sm font-medium text-gray-700">Active Sessions</span>
                     <span className="block text-[10px] text-gray-400 uppercase tracking-wide">2 Devices</span>
                  </div>
               </div>
               <ArrowRight size={16} className="text-gray-300" />
            </button>
         </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {sections.map((section) => {
        const isProfile = section.id === Tab.PROFILE;
        const isOpen = activeTab === section.id;
        
        return (
          <GlassCard 
            key={section.id} 
            className={`
              overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
              ${isProfile ? 'md:col-span-2' : 'col-span-1'}
              ${!isProfile && isOpen ? 'ring-1 ring-white/60 shadow-lg' : ''}
              ${!isProfile ? 'hover:bg-white/60' : ''}
            `}
          >
            {/* Header */}
            <button 
              onClick={() => toggleTab(section.id)}
              className={`
                w-full flex items-center justify-between p-6 focus:outline-none
                ${isProfile ? 'cursor-default pointer-events-none' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-xl transition-colors duration-300
                  ${isOpen && !isProfile ? 'bg-gray-900 text-white' : 'bg-white/50 text-gray-400'}
                `}>
                  <section.icon size={20} />
                </div>
                <div className="text-left">
                  <span className={`block text-lg font-medium transition-colors ${isOpen && !isProfile ? 'text-gray-900' : 'text-gray-600'}`}>
                    {section.label}
                  </span>
                  {!isOpen && !isProfile && (
                    <span className="block text-xs text-gray-400 font-light animate-fade-in md:hidden">
                      {section.summary}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Chevron: Only show on Mobile non-profile items */}
              {!isProfile && (
                <ChevronDown 
                  className={`
                    text-gray-300 transition-transform duration-500 md:hidden
                    ${isOpen ? 'rotate-180 text-gray-800' : ''}
                  `} 
                  size={20} 
                />
              )}
            </button>

            {/* Content Container */}
            <div 
              className={`
                px-6 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
                ${isProfile ? 'max-h-[1200px] opacity-100 pb-8' : (isOpen ? 'max-h-[800px] opacity-100 pb-8' : 'max-h-0 opacity-0')}
                md:max-h-none md:opacity-100 md:pb-8 md:block
              `}
            >
              {section.content}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};
