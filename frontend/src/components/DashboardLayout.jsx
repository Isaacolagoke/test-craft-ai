import React from 'react'
import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon, 
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import logoText from '../assets/logo-text.svg'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function DashboardLayout({ children }) {
  const [notifications, setNotifications] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const { logout } = useAuth()

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      // Temporarily disabled
      /*const response = await axios.get('/api/notifications')
      setNotifications(response.data)*/
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      // Temporarily disabled
      /*const response = await axios.get('/api/notifications/unread-count')
      setUnreadCount(response.data.count)*/
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notifications as read
  const markAsRead = async (notificationIds) => {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) return

    try {
      await axios.put('/api/notifications/read', { notificationIds })
      fetchUnreadCount()
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  // Initial fetch
  React.useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [])

  // Check if there are any unread notifications
  const hasUnreadNotifications = React.useMemo(() => {
    return Array.isArray(notifications) && notifications.some(n => !n.read)
  }, [notifications])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-[700px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <header className="fixed top-0 w-full max-w-[700px] bg-white border-b border-slate-200 z-10">
          <div className="h-16 px-4 sm:px-6 md:px-container-padding flex items-center justify-between">
            <Link to="/dashboard" className="cursor-pointer">
              <img src={logoText} alt="TestCraft.ai" className="h-6" />
            </Link>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell with Dropdown */}
              <Menu as="div" className="relative">
                {({ open }) => (
                  <>
                    <Menu.Button 
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 relative"
                      onClick={() => {
                        if (open && unreadCount > 0) {
                          const unreadIds = notifications
                            .filter(n => !n.read)
                            .map(n => n._id)
                          if (unreadIds.length > 0) {
                            markAsRead(unreadIds)
                          }
                        }
                      }}
                    >
                      {!loading && unreadCount > 0 ? (
                        <>
                          <BellAlertIcon className="w-5 h-5 text-[#06545E]" />
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-xs text-white bg-red-500 rounded-full px-1">
                            {unreadCount}
                          </span>
                        </>
                      ) : (
                        <BellIcon className="w-5 h-5" />
                      )}
                    </Menu.Button>

                    <Transition
                      enter="transition duration-100 ease-out"
                      enterFrom="transform scale-95 opacity-0"
                      enterTo="transform scale-100 opacity-100"
                      leave="transition duration-75 ease-out"
                      leaveFrom="transform scale-100 opacity-100"
                      leaveTo="transform scale-95 opacity-0"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-1 overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="font-medium text-sm text-slate-900">Notifications</h3>
                          {hasUnreadNotifications && (
                            <button
                              onClick={() => {
                                const unreadIds = notifications
                                  .filter(n => !n.read)
                                  .map(n => n._id)
                                if (unreadIds.length > 0) {
                                  markAsRead(unreadIds)
                                }
                              }}
                              className="text-xs text-[#06545E] hover:text-[#06545E]/80 font-medium flex items-center gap-1"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Mark all as read
                            </button>
                          )}
                        </div>
                        {loading ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-600">Loading...</p>
                          </div>
                        ) : notifications.length > 0 ? (
                          <div className="max-h-[300px] overflow-y-auto">
                            {notifications.map((notification) => (
                              <Menu.Item key={notification._id}>
                                {({ active }) => (
                                  <button
                                    className={`${
                                      active ? 'bg-slate-50' : ''
                                    } w-full text-left p-4 border-b border-slate-100 last:border-0 relative`}
                                    onClick={() => {
                                      if (!notification.read) {
                                        markAsRead([notification._id])
                                      }
                                    }}
                                  >
                                    {!notification.read && (
                                      <span className="absolute top-4 right-4 w-2 h-2 bg-[#06545E] rounded-full" />
                                    )}
                                    <div className="flex flex-col gap-1 pr-4">
                                      <span className="text-sm font-medium text-slate-900">{notification.title}</span>
                                      <span className="text-sm text-slate-600">{notification.message}</span>
                                      <span className="text-xs text-slate-400">
                                        {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                          hour: 'numeric',
                                          minute: 'numeric',
                                          hour12: true
                                        })}
                                      </span>
                                    </div>
                                  </button>
                                )}
                              </Menu.Item>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-600">No notifications</p>
                          </div>
                        )}
                      </Menu.Items>
                    </Transition>
                  </>
                )}
              </Menu>

              {/* Profile Menu */}
              <Menu as="div" className="relative">
                {({ open }) => (
                  <>
                    <Menu.Button className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserCircleIcon className="w-5 h-5" />
                      </div>
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </Menu.Button>

                    <Transition
                      enter="transition duration-100 ease-out"
                      enterFrom="transform scale-95 opacity-0"
                      enterTo="transform scale-100 opacity-100"
                      leave="transition duration-75 ease-out"
                      leaveFrom="transform scale-100 opacity-100"
                      leaveTo="transform scale-95 opacity-0"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${
                                active ? 'bg-slate-50' : ''
                              } w-full text-left px-4 py-2 text-sm text-slate-700 flex items-center gap-2`}
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                              Settings
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={logout}
                              className={`${
                                active ? 'bg-slate-50' : ''
                              } w-full text-left px-4 py-2 text-sm text-red-600 flex items-center gap-2`}
                            >
                              <ArrowRightOnRectangleIcon className="w-4 h-4" />
                              Logout
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </>
                )}
              </Menu>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="pt-16">
          <div className=" py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}