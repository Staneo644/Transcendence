import '../css/inviteChannel.css';
import axios from 'axios';
import React, {useCallback, useEffect, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {Channel, isBan, User} from '../../../pages/chat';
import {switchChatModalInviteChannel} from '../../../redux/chat/modalChatSlice';
import {RootState} from '../../../redux/store';
import SocketSingleton from '../../../socket';
import {setErrorLocalStorage} from '../../IfError';
import {ProfilImage} from '../../profil/ProfilImage';
import {ProfilName} from '../../profil/ProfilName';
import Search from '../../search/userSearch';
import {IUser} from '../../utils/interface';
import jwtDecode from 'jwt-decode';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

type AddUserIdProps = {
	usersId: Array<string>;
	setUserId: React.Dispatch<React.SetStateAction<Array<string>>>;
	channelId: string;
	channel: Channel
};

const AddUserId = ({usersId, setUserId, channelId, channel}: AddUserIdProps) => {
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
		socket.emit('invite_channel', {
			receiver_id: id,
			channel_id: channelId,
			token: localStorage.getItem('jwtAuthorization')
		});
	};

	if (listUser == null || listUser.length == 0) {
		return (null);
	}
	return (
		<div className='chat-channel-invite-add-user-by-id'>
			{listUser.slice(0, 6).map((user) => (
				!usersId.includes(user.id) && !isBan(channel, user) ? (
					<div className='chat-invite-people-user' key={user.id} onClick={() => handleOnClick(user.id)}>
						<ProfilImage id={user.id} OnClickOpenProfil={false} OverwriteClassName='chat-small-user-image'/>
						<ProfilName id={user.id}/>
					</div>
				) : <div key="notUser"></div>
			))}
		</div>
	);
}


const InviteChannel = ({channel}: { channel: Channel }) => {
	const dispatch = useDispatch();
	const [usersId, setUserId] = useState<Array<string>>([]);
	const navigate = useNavigate();
	const [myId, setMyId] = useState<string>('');

	useEffect(() => {
		if (localStorage.getItem('jwtAuthorization') != null) {
			const jwt_decode : any = jwtDecode('' + localStorage.getItem('jwtAuthorization'));
			setMyId(jwt_decode.sub);
		} else {
			navigate('/error');
		}
	}, [navigate]);

	useEffect(() => {
		channel.users.map((element: User) => {
			setUserId((prevList) => [...prevList, element.id]);
		});
	}, [channel]);

	return (
		<div className='page-shadow'>
			<div className='chat-channel-invite-people'>
				{channel.type !== 3 ? (
					<>
						<h2>Invite some people</h2>
						<button
							className='chat-side-bar-close-add-people-channel'
							onClick={() => dispatch(switchChatModalInviteChannel())}
						/>
						<div className='chat-side-bar-invite-channel'>
							<Search
								defaultAllUsers={true}
								OverwriteClassName={'chat-side-bar-invite-channel-input'}
								id={myId}
							/>
							<AddUserId
								channel={channel}
								usersId={usersId}
								setUserId={setUserId}
								channelId={channel.id}
							/>
						</div>
					</>
				) : (
					<div>
						{"You can't acces to this fonctionnality"}
						<button className='close-create-channel'
								onClick={() => dispatch(switchChatModalInviteChannel())}/>
					</div>
				)}
			</div>
		</div>
	);
};

export default InviteChannel;
