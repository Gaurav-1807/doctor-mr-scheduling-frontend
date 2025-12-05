import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <button
            onClick={markAllAsRead}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Mark All as Read
          </button>
        </div>

        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition ${
                !notif.isRead ? 'border-l-4 border-primary' : ''
              }`}
              onClick={() => !notif.isRead && markAsRead(notif._id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{notif.title}</h3>
                  <p className="text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notif.isRead && (
                  <span className="ml-4 w-3 h-3 bg-primary rounded-full"></span>
                )}
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
