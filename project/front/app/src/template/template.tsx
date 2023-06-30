import '../App.css'
import React, {useCallback, useEffect, useState} from 'react';
import Head from './header';
import Notification from '../components/notification/notification';
import {Outlet, useNavigate} from 'react-router-dom';
import SocketSingleton from '../socket';
import {setBeginStatus} from "../redux/game/beginToOption";
import {useDispatch, useSelector} from "react-redux";
import {setErrorLocalStorage} from '../components/IfError';
import {RootState} from "../redux/store";


const Template = () => {
	const [friendId, setFriendId] = useState('');
	const [rivalId, setRivalId] = useState('');
	const navigate = useNavigate();
	const [notif, setNotif] = useState(<></>);
	const [notifVisible, setNotifVisible] = useState(false);

	const dispatch = useDispatch();
	const socketInstance = SocketSingleton.getInstance();
	const socket = socketInstance.getSocket();
	const conversationId = useSelector((state: RootState) => state.conversationId.id);


	const confirmFriend = useCallback(() => {
		socket.emit('friend_request', {friend_id: friendId, token: localStorage.getItem('jwtAuthorization')})
	}, [socket, friendId]);

	const rejectFriend = () => {
		null
	}


	const confirmChallenge = useCallback(() => {
		socket.emit('challenge', {rival_id: rivalId, token: localStorage.getItem('jwtAuthorization')})
	}, [socket, rivalId]);

	function rejectChallenge() {
		null
	}

	useEffect(() => {
		socket.on('receive_challenge', (data: any) => {
			if (data.code == 3) {
				socket.on('game_found', (data) => {
					dispatch(setBeginStatus({
						decide: data.decide,
						playerstate: data.user,
						gameid: data.game_id,
						gamestate: 1
					}));
					socket.emit('leave_matchmaking', {token: localStorage.getItem('jwtAuthorization')})
					navigate("/optiongame")
					socket.off('game_found')
				});
				navigate('/optiongame');
			} else if (data.code == 2) {
				setRivalId(data.rival);
				setNotif(<Notification message={data.rival_name + ' wants battle'} onConfirm={confirmChallenge} onCancel={rejectChallenge} hasButton={true} setVisible={setNotifVisible}/>)
				setNotifVisible(true);
			}
		});

		socket.on('connection_error', () => {
			setErrorLocalStorage('unauthorized')
			navigate('/error');
		});

		socket.on('notif_message', (data: any) => {
			if (conversationId == data.channel.id)
			{
				setNotifVisible(false);
			}
			else
			{
			setNotifVisible(true);

			}
			let newmessage = data.user.username + ' : ' + data.content;
			if (data.content.length > 16) {
				newmessage = data.user.username + ' : ' + data.content.substring(0, 16) + '...';
			}
			setNotif(<Notification message={newmessage} onConfirm={() => {
				null
			}} onCancel={() => {
				null
			}} hasButton={false} setVisible={setNotifVisible}/>)
		})

		socket.on('friend_notif', (data: any) => {
			if (data.code == 4) {
				setFriendId(data.id);
				setNotif(<Notification message={data.username + ' wants to be your friend'} onConfirm={confirmFriend} onCancel={rejectFriend} hasButton={true} setVisible={setNotifVisible}/>);
				setNotifVisible(true)
			}
		})

		return () => {
			socket.off('receive_challenge');
			socket.off('notif_message');
			socket.off('connection_error');
			socket.off('friend_request');
		};
	}, [navigate, conversationId, socket, dispatch, confirmChallenge, confirmFriend]);

	return (
		<div className='page'>
			<header>
				<Head/>
			</header>
			{notifVisible &&
                <>
					{notif}
                </>
			}
			<main className='main-template'>
				<Outlet></Outlet>
			</main>
		</div>
	);
}

export default Template
