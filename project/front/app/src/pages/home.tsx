import './css/home.css'
import '../components/notification/notification.css'
import React, {useCallback, useEffect, useState} from 'react';
import ErrorToken, {setErrorLocalStorage} from '../components/IfError';
import {useNavigate} from 'react-router-dom';
import {IUser} from '../components/utils/interface';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../redux/store';
import {openModal} from '../redux/modal/modalSlice';
import Search from '../components/search/userSearch';
import axios from 'axios';
import SocketSingleton from '../socket';
import {ProfilImage} from '../components/profil/ProfilImage';
import jwtDecode from 'jwt-decode';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

const Add = () => {
	const [listUser, setListUser] = useState<Array<IUser> | null>([]);

	const navigate = useNavigate();
	const dispatch = useDispatch();

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
			socket.on('friend_code', (data: any) => {
				if (data.code == 2) {
					refresh()
					return;
				} else if (data.code === 5 || data.code === 7) {
					refresh();
				}
				return;
			})

			socket.on('friend_request', (data: any) => {
				if (data.code == 2 || data.code == 7) {
					refresh();
					return;
				}
				return;
			})
		}
		return () => {
			if (listUser == null) {
				socket.off('friend_code');
				socket.off('friend_request');
			}
		};
	}, [listUser, refresh]);

	if (listUser == null || listUser.length == 0) {
		return (
			<p className='home-no-friend'>Knowing how to enjoy your own company is an art. <span>Natasha Adamo</span>
			</p>);
	}

	const handleHistory = (id: string | null) => {
		navigate('/history/' + id);
	};

	const handlechallenge = (id: string | null) => {
		socket.emit('challenge', {rival_id: id, token: localStorage.getItem('jwtAuthorization')});
	}

	return (
		<div className='home-users-list'>
			{listUser.map((user) => (
				<div className='home-users-list-user' key={user.id}>
					<div className='home-users-list-user-info'>
						<ProfilImage id={user.id} OnClickOpenProfil={true} OverwriteClassName='home-users-list-user-image-profil' />
						<p className='home-users-list-user-info-name' onClick={() => dispatch(openModal(user.id))}>{user.username} </p>
						<p className='xp'>{user.experience}XP</p>
						<p>{user.victories + '/' + user.defeats}</p>
						<p>
							{user.defeats + user.victories === 0 ? (
								null
							) : (
								'WR: ' +
								((user.victories / (user.defeats + user.victories) * 100).toFixed(2)) + '%'
							)}</p>
					</div>
					<div className='home-users-list-user-buttons'>
						<button
							onClick={() => handlechallenge(user.id)}
							className='home-users-list-user-buttons-challenge-button'
						>
							Challenge
						</button>
						<button
							onClick={() => handleHistory(user.id)}
							className='home-users-list-user-buttons-hsitory-button'
						>
							history
						</button>
					</div>
				</div>
			))}
		</div>
	);
}

const Home = () => {
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
	

	return (
		<div className='home'>
			<ErrorToken/>
			<div className='scrollBlock'>
				<Search
					defaultAllUsers={false}
					OverwriteClassName={''}
					id={myId}
				/>
				<Add/>
			</div>
		</div>
	);

}

export default Home;

