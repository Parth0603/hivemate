import { Router } from 'express';
import {
  sendMessage,
  getChatHistory,
  getUserChats,
  openPersonalChat,
  deleteMessageForMe,
  deleteMessageForEveryone
} from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All message routes require authentication
router.post('/', authenticate, sendMessage);
router.get('/chats', authenticate, getUserChats);
router.post('/open/:friendId', authenticate, openPersonalChat);
router.get('/chat/:chatRoomId', authenticate, getChatHistory);
router.delete('/:messageId/me', authenticate, deleteMessageForMe);
router.delete('/:messageId/everyone', authenticate, deleteMessageForEveryone);

export default router;
