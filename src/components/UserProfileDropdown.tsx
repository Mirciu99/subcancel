'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
}

interface UserProfileDropdownProps {
  user: User
  onLogout: () => void
}

export default function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const menuItems = [
    {
      label: 'Profile',
      href: '/profile',
      icon: '👤',
      description: 'Informații cont'
    },
    {
      label: 'Abonamentele mele',
      href: '/subscriptions', 
      icon: '📊',
      description: 'Gestionează servicii'
    },
    {
      label: 'Plans',
      href: '/plans',
      icon: '🚀',
      description: 'Planuri și upgrade'
    },
    {
      label: 'Billing',
      href: '/billing',
      icon: '💳',
      description: 'Plăți și facturi'
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: '⚙️',
      description: 'Preferințe cont'
    }
  ]

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const getAvatarColor = (email: string) => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)', 
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #a8edea, #fed6e3)',
      'linear-gradient(135deg, #ff9a9e, #fecfef)',
      'linear-gradient(135deg, #ffecd2, #fcb69f)'
    ]
    const index = email.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-3 hover:bg-white/5 rounded-xl px-3 py-2 transition-all duration-200 group"
        style={{
          background: isOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
        }}
      >
        {/* User Info - Hidden on mobile */}
        <div className="user-info-desktop hidden sm:block text-right">
          <p className="text-sm font-medium text-gray-100 group-hover:text-white transition-colors">
            {user?.name || 'User'}
          </p>
          <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
            {user?.email}
          </p>
        </div>

        {/* Avatar */}
        <div 
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg group-hover:scale-105 transition-transform duration-200"
          style={{
            background: getAvatarColor(user?.email || 'default@email.com')
          }}
        >
          {getInitials(user?.name || '', user?.email || '')}
          
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full"></div>
        </div>

        {/* Dropdown Arrow */}
        <div 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in-up">
          {/* User Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg"
                style={{
                  background: getAvatarColor(user?.email || 'default@email.com')
                }}
              >
                {getInitials(user?.name || '', user?.email || '')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors duration-200 group ${
                  pathname === item.href ? 'bg-blue-500/10 border-r-2 border-blue-500' : ''
                }`}
              >
                <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    pathname === item.href ? 'text-blue-400' : 'text-gray-200 group-hover:text-white'
                  } transition-colors`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                    {item.description}
                  </div>
                </div>
                {pathname === item.href && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors duration-200 group text-left"
          >
            <span className="text-lg group-hover:scale-110 transition-transform duration-200">
              🚪
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                Logout
              </div>
              <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                Ieși din cont
              </div>
            </div>
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out;
        }

        @media (max-width: 640px) {
          .user-info-desktop {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}