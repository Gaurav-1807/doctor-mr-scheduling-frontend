import { io } from 'socket.io-client';

// Use REACT_APP_SOCKET_URL (base URL without /api) for socket connection
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) {
    console.log('Socket already connected:', socket.id);
    return socket;
  }
  
  // Disconnect existing socket if any
  if (socket) {
    console.log('Disconnecting existing socket...');
    socket.disconnect();
    socket = null;
  }
  
  console.log('🔌 Initializing socket connection to:', SOCKET_URL);
  
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('🔴 Socket connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Socket reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('🔴 Socket reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('🔴 Socket reconnection failed after all attempts');
  });

  socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const isSocketConnected = () => socket?.connected || false;

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

const socketUtils = { initSocket, getSocket, disconnectSocket, isSocketConnected };
export default socketUtils;
