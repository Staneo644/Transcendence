import './css/chat.css'
import React, {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Conversation from '../components/chat/conversation/conversation';
import CreateChannel from '../components/chat/createChannel/CreateChannel';
import InviteChannel from '../components/chat/inviteChannel/InviteChannel';
import OptionBar from '../components/chat/optionBar/optionBar';
import SideBarChat from '../components/chat/sidebar';
import ErrorToken, {setErrorLocalStorage} from '../components/IfError';
import {RootState} from '../redux/store';
import SendMessage from '../components/chat/input/sendmessage';
import SocketSingleton from '../socket';
import ModifyChannel from "../components/chat/modifyChannel/ModifyChannel";
import ListUserChannel from '../components/chat/ListUsers';
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import {closeChatModalListUser, switchChatModalListUser} from '../redux/chat/modalChatSlice';
import {setChannelId} from "../redux/conversationId/conversationId";

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

export interface User {
	id: string;
	email: string;
	username: string;
	enabled2FA: boolean;
	experience: number;
	status: number;
}

export interface Channel {
	id: string;
	name: string;
	topic: string | null;
	type: number;
	pwd: string | null;
	creator: User;
	users: Array<User>;
	admins: Array<User>;
	bannedUsers: Array<User>;
	mutedUsers: Array<any>;
}

export interface Message {
	content: string;
	date: string;
	id: string;
	user: User;
}

export interface ChanMessage {
	channelId: string;
	ListMessages: Array<Message>;
}

export const initialUserState: User = {
	id: '',
	email: '',
	username: '',
	enabled2FA: false,
	experience: 0,
	status: 0,
}

export const initialChannelState: Channel = {
	id: '',
	name: '',
	topic: null,
	type: 0,
	pwd: null,
	users: [],
	creator: initialUserState,
	admins: [],
	bannedUsers: [],
	mutedUsers: [],
}

export const isAdmin = (channel: Channel, userId: string) => {
	return (channel.admins.some((admin) => admin.id === userId));
};

export const isBan = (channel: Channel, userId: User) => {
	return (channel.bannedUsers.some((banned) => banned.id === userId.id));
};

export const isMe = (user: User, myId: string) => {
	return (user.id === myId);
};

const updateAvailableChannel = (input: string) => {
	if (input === '') {
		return;
	}
	socket.emit('research_channel', {search: input, token: localStorage.getItem('jwtAuthorization')})
}

////////////////////////// CHAT ///////////////////////////////////////////////
function Chat() {
	const isOpenSideBar = useSelector((state: RootState) => state.modalChat.isOpenSideBar);
	const isOpenCreateChannel = useSelector((state: RootState) => state.modalChat.isOpenCreateChannel);
	const isOpenInviteChannel = useSelector((state: RootState) => state.modalChat.isOpenInviteChannel);
	const isOpenUpdateChannel = useSelector((state: RootState) => state.modalChat.isOpenUpdateChannel);
	const isOpenListUserChannel = useSelector((state: RootState) => state.modalChat.isOpenListUser);

	const navigate = useNavigate();
	const dispatch = useDispatch();

	const [channel, setChannel] = useState<Channel>(initialChannelState);
	const [listChannel, setListChannel] = useState<Array<Channel>>([]);
	const [listAvailableChannel, setListAvailableChannel] = useState<Array<Channel>>([]);

	const [conversationId, setConversationId] = useState<string>('');
	const [updateChannel, setUpdateChannel] = useState<number>(0);

	const [messages, setMessages] = useState<Array<Message>>([]);
	const [errorGetMessage, setErrorGetMessage] = useState<boolean>(false);
	const [errorPostMessage, setErrorPostMessage] = useState<string>('');
	const [sendMessage, setSendMessage] = useState<boolean>(false);

	const [password] = useState<Map<string, string>>(new Map());
////////////////////////// FETCH DATA /////////////////////////////////////////
	const fetchAvailableChannel = useCallback(async () => {
		try {
			const response = await axios.get(process.env.REACT_APP_IP + ':3000/channel/available', {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			});
			setListAvailableChannel(response.data);
		} catch (error: any) {
			console.error(error);
			if (error?.response?.status === 401 || error?.response?.status === 500) {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
			}
		}
	}, [navigate]);
	const fetchListChannel = useCallback(async () => {
		try {
			const response = await axios.get(process.env.REACT_APP_IP + ':3000/user/channels', {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			});
			setListChannel(response.data);
		} catch (error) {
			console.error(error);
		}
	}, []);

	const fetchListMessage = useCallback(async () => {
		if (conversationId === '') {
			return;
		}
		try {
			const response = await axios.get(process.env.REACT_APP_IP + ':3000/channel/message/' + conversationId, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			});
			if (response.status === 204) {
				setMessages([]);
			} else {
				setMessages(response.data);
			}
			setErrorGetMessage(false);
		} catch (error: any) {
			console.error(error);
			if (error.response.status === 401 || error.response.status === 500) {
				setErrorLocalStorage('unauthorized');
				navigate('/Error');
			}
			setErrorGetMessage(true);
		}
	}, [conversationId, navigate]);

	const findChannel = useCallback(() => {
		if (listChannel.length == 0) {
			setChannel(initialChannelState);
			if (isOpenListUserChannel) {
				dispatch(switchChatModalListUser());
			}
			return;
		}
		listChannel.map((itemChannel) => {
			if (itemChannel.id == conversationId) {
				setChannel({...itemChannel});
			}
		});
	}, [isOpenListUserChannel, dispatch, conversationId, listChannel]);

	const handleResearchChannel = useCallback((data: any) => {
		if (!data.channels || data.channels.length == 0)
			return;
		setListAvailableChannel(data.channels);
	}, []);

	const handleUpdateUserChannel = useCallback((data: any) => {
		if (data.code === 0) {
			setListChannel((prevListChannel) => {
				let channelExists = false;

				const updatedListChannel = prevListChannel.map((itemChannel) => {
					if (itemChannel.id === data.channel.id) {
						channelExists = true;
						return data.channel;
					}
					return itemChannel;
				});

				if (channelExists) {
					return updatedListChannel;
				} else {
					setConversationId(data.channel.id);
					return [...updatedListChannel, data.channel];
				}
			});
		}
		setUpdateChannel((prevUpdateChannel) => prevUpdateChannel + 1);
		if (updateChannel > 10) {
			setUpdateChannel(0);
		}
	}, [updateChannel]);

	const handleJoinChannel = useCallback((channel_id: string) => {
		if (password.get(channel_id)) {
			socket.emit('join_channel', {
				channel_id: channel_id,
				password: password.get(channel_id),
				token: localStorage.getItem('jwtAuthorization')
			});
			return;
		} else {
			socket.emit('join_channel', {channel_id: channel_id, token: localStorage.getItem('jwtAuthorization')});
		}
	}, [password]);

	const handleMessage = useCallback((data: any) => {
		if (data.channel.id == conversationId) {
			const newItemMessage: Message = {
				content: data.content,
				id: data.id,
				user: data.user,
				date: data.date,
			}
			setMessages((prevListMessage) => {
				if (prevListMessage.length === 0) {
					return [newItemMessage];
				} else if (!prevListMessage.some((message) => message.id === newItemMessage.id)) {
					return [...prevListMessage, newItemMessage];
				} else {
					return prevListMessage;
				}
			});
		}
		return;
	}, [conversationId]);

	const handleMessageCode = useCallback((data: any) => {
		setSendMessage(false);
		if (data.code == 3) {
			setErrorPostMessage(data.message);
		}
		if (data.code == 0) {
			setErrorPostMessage('');
		}
	}, []);

	const handleDeleteChannel = useCallback((data: any) => {
		if (conversationId == data.id) {
			setConversationId('');
			dispatch(closeChatModalListUser());
		}
		setListChannel((prevListChannel) =>
			prevListChannel.filter((itemChannel) => itemChannel.id !== data.id)
		);
	}, [conversationId, dispatch]);

	const handleUpdateChannel = useCallback((data: any) => {
		if (data.code == 0) {
			setListChannel((prevListChannel) =>
				prevListChannel.map((itemChannel) => {
					if (itemChannel.id === data.channel_id) {
						return {...itemChannel, name: data.name, type: data.type};
					}
					return itemChannel;
				})
			);
			if (data.channel_id === conversationId) {
				setChannel((prevChannel) => ({...prevChannel, name: data.name, type: data.type}));
			}
		}
	}, [conversationId]);

	useEffect(() => {
		fetchListChannel();
		fetchAvailableChannel();

		socket.on('update_user_channel', handleUpdateUserChannel);
		socket.on('research_channel', handleResearchChannel);

		return () => {
			socket.off('update_user_channel');
			socket.off('research_channel');
		}
	}, [fetchListChannel, handleUpdateUserChannel, handleResearchChannel, fetchAvailableChannel]);
	useEffect(() => {
		fetchListMessage();
		findChannel();
		if (conversationId == '') {
			dispatch(closeChatModalListUser());
		}

		socket.on('join_channel', handleJoinChannel);
		socket.on('message', handleMessage);
		socket.on('message_code', handleMessageCode);
		socket.on('delete_channel', handleDeleteChannel);
		socket.on('update_channel', handleUpdateChannel);

		return () => {
			socket.off('update_channel');
			socket.off('join_channel');
			socket.off('delete_channel');
			socket.off('message');
			socket.off('message_code');
			setErrorPostMessage('');
		};
	}, [conversationId, updateChannel, fetchListChannel, listChannel,
		handleJoinChannel, handleMessage, handleDeleteChannel,
		findChannel, fetchListMessage, handleUpdateChannel,
		handleMessageCode, dispatch
	]);

	useEffect(() => {
		dispatch(setChannelId(conversationId));
	}, [conversationId, dispatch])

	return (
		<>

			<div className='chatPage'>
				<ErrorToken/>
				<OptionBar setId={setConversationId}/>
				{isOpenSideBar && (<SideBarChat
					listChannel={listChannel}
					setConversationId={setConversationId}
				/>)}
				{isOpenCreateChannel && (<CreateChannel/>)}
				{isOpenInviteChannel && (<InviteChannel channel={channel}/>)}
				{isOpenUpdateChannel && (<ModifyChannel channel={channel}/>)}
				{conversationId != '' ? (
					<div className='chat-right-page'>

						<Conversation
							listMessages={messages}
							channel={channel}
							errorGetMessage={errorGetMessage}
						/>
						<SendMessage
							conversation={conversationId}
							errorPostMessage={errorPostMessage}
							setPostMessage={setSendMessage}
							postMessage={sendMessage}
						/>
					</div>
				) : (
					<div className='chat-page-channel'>
						<h1>Channels disponible</h1>
						<input className='chat-page-channels-input' placeholder='Search channel' onChange={(e) => updateAvailableChannel(e.target.value)}/>
						{listAvailableChannel.length > 0 ? (
							listAvailableChannel.map((itemChannel) => (
								<div className='chat-page-channels-channel' key={itemChannel.id}>
									<p>{itemChannel.name}</p>
									{itemChannel.type == 2 ? (
										<input className='chat-page-channel-password-input' type='password' placeholder='Password' onChange={event => password.set(itemChannel.id, event.target.value)}/>
									) : null
									}
									<button onClick={() => handleJoinChannel(itemChannel.id)}>Join</button>
								</div>
							))
						) : null
						}
					</div>
				)}
				{isOpenListUserChannel && (<ListUserChannel channel={channel}/>)}
			</div>
		</>
	);
}

export default Chat;
