import '../css/CreateChannel.css'
import React, {useCallback, useEffect, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux';
import {switchChatModalCreateChannel} from '../../../redux/chat/modalChatSlice';
import {Channel, User} from '../../../pages/chat';
import axios from 'axios';
import SocketSingleton from '../../../socket';
import Search from '../../search/userSearch';
import {IUser} from '../../utils/interface';
import {useNavigate} from 'react-router-dom';
import {setErrorLocalStorage} from '../../IfError';
import {RootState} from '../../../redux/store';
import {ProfilImage} from '../../profil/ProfilImage';
import {ProfilName} from '../../profil/ProfilName';
import jwtDecode from 'jwt-decode';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

const initialUserState: User = {
	id: '',
	email: '',
	username: '',
	enabled2FA: false,
	experience: 0,
	status: 0,
}

const initialChannelState: Channel = {
	id: '',
	name: 'New Channel',
	topic: null,
	type: 0,
	pwd: '',
	users: [],
	creator: initialUserState,
	admins: [],
	bannedUsers: [],
	mutedUsers: [],

}

type AddUserIdProps = {
	usersId: Array<string>;
	setUserId: React.Dispatch<React.SetStateAction<Array<string>>>;
};

const AddUserId = ({usersId, setUserId}: AddUserIdProps) => {
	const [listUser, setListUser] = useState<Array<IUser> | null>([]);

	const navigate = useNavigate();

	const searchUser = (useSelector((state: RootState) => state.searchUser.users));
	useEffect(() => {
		setListUser(searchUser);
	}, [searchUser]);

	const refresh = useCallback(() => {
		axios.get(process.env.REACT_APP_IP + ':3000/user/friend', {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((res) => {
				setListUser(res.data);
			})
			.catch((error) => {
				console.error(error);
				setErrorLocalStorage(error.response.status);
				navigate('/Error');
			})
	}, [navigate]);

	useEffect(() => {
		if (listUser == null) {
			refresh();
		}
	}, [listUser, refresh]);

	const handleOnClick = (id: string) => {
		setUserId((prevListId) => {
			if (!prevListId.some((idInList) => id === idInList)) {
				return [...prevListId, id];
			}
			return prevListId;
		});
	};

	if (listUser == null || listUser.length == 0) {
		return (null);
	}
	return (
		<div className='chat-users-list-add-user-by-id'>
			{listUser.slice(0, 3).map((user) => (
				!usersId.includes(user.id) ? (
					<div className='chat-add-user-by-id' key={user.id} onClick={() => handleOnClick(user.id)}>
						<ProfilImage id={user.id} OnClickOpenProfil={false}
							OverwriteClassName='chat-small-user-image'/>
						<ProfilName id={user.id}/>
					</div>
				) : null
			))}
		</div>
	);
}


const CreateChannel = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [channelParams, setChannelParams] = useState<Channel>(initialChannelState);
	const [usersId, setUserId] = useState<Array<string>>([]);
	const [errorPwd, setErrorPwd] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [myId, setMyId] = useState<string>('');

	useEffect(() => {
		if (localStorage.getItem('jwtAuthorization') != null) {
			const jwt_decode : any = jwtDecode('' + localStorage.getItem('jwtAuthorization'));
			setMyId(jwt_decode.sub);
		} else {
			navigate('/error');
		}
	}, [navigate]);

	const onSubmitChannelName = (str: string) => {
		setChannelParams((prevChannelParams) => ({
			...prevChannelParams,
			name: str,
		}));
	};

	const handlePasswordChange = (str: string) => {
		setErrorPwd(false);
		setChannelParams((prevChannelParams) => ({
			...prevChannelParams,
			pwd: str,
		}));
	};

	const handleChannelTypeChange = (type: number) => {
		setChannelParams((prevChannelParams) => ({
			...prevChannelParams,
			type: type,
		}));
	};

	const handleNewChannel = () => {
		if (channelParams.type === 2) {
			const pwd = '' + channelParams.pwd;
			if (pwd.length === 0) {
				setErrorPwd(true);
				return;
			}
		}
		axios.post(process.env.REACT_APP_IP + ':3000/channel/create',
			{
				name: channelParams.name,
				creator_id: myId,
				type: channelParams.type,
				password: channelParams.pwd,
			},
			{
				headers: {Authorization: `bearer ${localStorage.getItem('jwtAuthorization')}`,}
			})
			.then((response) => {
				setErrorMessage('');
				socket.emit('join_channel', {
					channel_id: response.data.id,
					token: localStorage.getItem('jwtAuthorization')
				});
				usersId.map((userId) => {
					socket.emit('invite_channel', {
						receiver_id: userId,
						channel_id: response.data.id,
						token: localStorage.getItem('jwtAuthorization')
					});
				});
				dispatch(switchChatModalCreateChannel());
			})
			.catch((error) => {
				console.error(error);
				setErrorMessage(error.response.data);
				if (error.response.status === 401 || error.response.status === 500) {
					setErrorLocalStorage('unauthorized');
					navigate('/Error');
				}
			});
		return;
	};

	return (
		<div className='page-shadow'>
			<div className='create-channel'>
				<h2>Create Channel</h2>
				<h3>Channel Name</h3>
				<button className='close-create-channel' onClick={() => dispatch(switchChatModalCreateChannel())}/>
				<input className='channel-name-input' type='text' placeholder='Channel Name' value={channelParams.name}
					onChange={(e) => onSubmitChannelName(e.target.value)}/>
				<div className='ButtonChangeTypeChannel'>
					<h3>Channel Type</h3>
					<button className={'channel-type-button' + ' ' + (channelParams.type === 0 ? 'channel-type-button-selected' : '')} onClick={() => handleChannelTypeChange(0)}>Private</button>
					<button className={'channel-type-button' + ' ' + (channelParams.type === 1 ? 'channel-type-button-selected' : '')} onClick={() => handleChannelTypeChange(1)}>Public</button>
					<button className={'channel-type-button' + ' ' + (channelParams.type === 2 ? 'channel-type-button-selected' : '')} onClick={() => handleChannelTypeChange(2)}>Protected
					</button>
				</div>
				{channelParams.type === 2 ? (
					<>
						<div className='divInputPassword'>
							<h3>Password</h3>
							<input
								className='channel-password-input'
								placeholder='Password'
								type='password'
								id='password'
								onChange={(e) => handlePasswordChange(e.target.value)}
							/>
							{errorPwd ?
								<p className='chat-create-channel-error-message'>
									{"* password length can't be null"}
								</p>
								:
								null
							}
						</div>
					</>
				) : null}
				{channelParams.type === 0 ? (
					<>
						<div className='chat-create-channel-find-user'>
							<h3>Invite some people:</h3>
							<Search
								defaultAllUsers={true}
								OverwriteClassName={'create-channel-invite-input'}
								id={myId}
							/>
							<AddUserId usersId={usersId} setUserId={setUserId}/>
						</div>
					</>
				) : null}
				{errorMessage !== '' ? (
					<p className='chat-create-channel-error-message'>
						{'* ' + errorMessage}
					</p>
				) : null}
				<button className='channel-create-channel-button' onClick={() => handleNewChannel()}>New Channel
				</button>
			</div>
		</div>
	);
}

export default CreateChannel;
