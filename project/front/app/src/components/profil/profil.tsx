import './profil.css'
import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ButtonInputToggle} from '../utils/inputButton';
import LogoutButton from './logout';
import {setErrorLocalStorage} from '../IfError'
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {closeModal} from '../../redux/modal/modalSlice';
import {ProfilImage} from './ProfilImage';
import axios from 'axios';
import SocketSingleton from '../../socket';
import {ProfilName} from './ProfilName';
import jwtDecode from 'jwt-decode';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();


export default function Profil() {
	const initialElement = [];
	const navigate = useNavigate();
	const [isMe, setIsMe] = useState<boolean>(false);
	const [myId, setMyId] = useState<string>('');

	useEffect(() => {
		if (localStorage.getItem('jwtAuthorization') != null) {
			const jwt_decode : any = jwtDecode('' + localStorage.getItem('jwtAuthorization'));
			setMyId(jwt_decode.sub);
		} else {
			navigate('/error');
		}
	}, [navigate]);

	const [isFriend, setIsFriend] = useState<boolean>(false);
	const [checked, setChecked] = useState(false);
	const [errorName, setErrorName] = useState<boolean>(false);
	const [errorNameMessage, setErrorNameMessage] = useState<string>('');
	const [errorImageMessage, setErrorImageMessage] = useState<string>('');
	const [victories, setVictory] = useState<number>(0);
	const [defeats, setDefeat] = useState<number>(0);
	const [experience, setExperience] = useState<number>(0);
	const [hasFriendRequest, setHasFriendRequest] = useState<number>(0);
	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const id = useSelector((state: RootState) => state.modal.id);
	const dispatch = useDispatch();

  const escFunction = useCallback((event:  any) => {
    if (event.key === "Escape") {
		dispatch(closeModal());
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", escFunction, false);

    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, [escFunction]);

	const refresh = useCallback((id: string | null) => {
		axios.get(process.env.REACT_APP_IP + ':3000/auth/2fa/is2FA', {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				setChecked(response.data);
			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
				dispatch(closeModal());
			});

		axios.get(process.env.REACT_APP_IP + ':3000/user/id/' + id, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				setVictory(response.data.victories);
				setDefeat(response.data.defeats);
				setExperience(response.data.experience);
				if (myId == response.data.id) {
					setIsMe(true);
				}
			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
				dispatch(closeModal());
			});
		axios.post(process.env.REACT_APP_IP + ':3000/user/isfriend',
			{friend_id: id},
			{
				headers: {Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,},
			})
			.then((Response) => {
				setIsFriend(Response.data.isfriend);
			})
			.catch((error) => {
				if (error?.response?.status === 401 || error?.response?.status === 500) {
					setErrorLocalStorage('Error ' + error?.response?.status);
					navigate('/Error');
					dispatch(closeModal());
				}
				navigate('/Error');
				dispatch(closeModal());
			});
		axios.get(process.env.REACT_APP_IP + ':3000/user/friend/request', {
			headers: {Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,},
		}).then((Response) => {
			for (const request of Response.data) {
				if (request.sender.id === id) {
					setHasFriendRequest(1);
					return;
				}
				if (request.sender.id === myId && request.receiver.id === id) {
					setHasFriendRequest(2);
					return;
				}
			}
		}).catch((error) => {
			if (error?.response?.status === 401 || error?.response?.status === 500) {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
				dispatch(closeModal());
			}
			navigate('/Error');
			dispatch(closeModal());
		});

		axios.get(process.env.REACT_APP_IP + ':3000/user/friend/blocked', {
			headers: {Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,},
		}).then((Response) => {
			for (const blocked of Response.data) {
				if (blocked.id === id) {
					setIsUserBlocked(true);
					return;
				}
			}
		}).catch((error) => {
			if (error?.response?.status === 401 || error?.response?.status === 500) {
				setErrorLocalStorage('Error ' + error?.response?.status);
				navigate('/Error');
				dispatch(closeModal());
			}
			navigate('/Error');
			dispatch(closeModal());
		});
	}, [navigate, dispatch, myId]);

	useEffect(() => {
		if (id === myId) {
			setIsMe(true);
		}
		refresh(id);
	}, [navigate, id, refresh, dispatch, myId]);

	useEffect(() => {
		socket.on('block_code', (data) => {
			if (data.code == 2) {
				setIsUserBlocked(true);
			} else if (data.code == 3) {
				setIsUserBlocked(false);
			}
		})

		socket.on('friend_code', (data: any) => {
			if (data.code === 2 && !isFriend) {
				setIsFriend(!isFriend);
				return;
			} else if (data.code === 5 || data.code === 7) {
				setIsFriend(!isFriend);
			}
		})


		socket.on('friend_request', (data: any) => {
			if (data.id == id && (data.code == 2 || data.code == 7 || data.code == 5)) {
				setIsFriend(!isFriend);
			}
		})

		return () => {
			socket.off('friend_request');
			socket.off('friend_code');
			socket.off('block_code');
		}
	}, [isFriend, id, navigate]);


	const changeName = (str: string) => {
		axios.post(process.env.REACT_APP_IP + ':3000/user/name',
			{name: str},
			{
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			})
			.then(() => {
				setErrorName(false);
			})
			.catch((error) => {
				if (error?.response?.status == 401
					|| error?.response?.status == 500) {
					setErrorLocalStorage('Error ' + error?.response?.status);
					console.error(error);
					navigate('/Error');
				}
				setErrorName(true);
				const message = '' + error?.response?.data;
				setErrorNameMessage(message.substring(19));
			});
	}

	const clicked = () => {
		if (!checked) {
			navigate('/CreateTwoFa');
			dispatch(closeModal());
		} else {
			axios.get(process.env.REACT_APP_IP + ':3000/auth/2fa/disable', {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			})
				.then(() => {
					setChecked(false);
				})
				.catch((error) => {
					setErrorLocalStorage('Error ' + error?.response?.status);
					navigate('/Error');
				});
		}
	}

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		let change = false;
		const file = event.target.files && event.target.files[0];
		if (file) {
			const formData = new FormData();
			formData.append('image', file);

			axios({
				method: 'post',
				url: process.env.REACT_APP_IP + ':3000/user/image',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('jwtAuthorization')}`,
					'Content-Type': 'multipart/form-data',
				},
				data: formData,
			})
				.then(() => {
					change = true;
					setErrorImageMessage('');
				})
				.catch((error) => {
					if (error?.response?.status == 401
						|| error?.response?.status == 500) {
						setErrorLocalStorage('Error ' + error?.response?.status);
						navigate('/Error');
					}
					console.error(error);
					change = true;
					setErrorImageMessage(error?.response?.data?.message);
				});
			if (change === false) {
				setErrorImageMessage('Bad format');
			}
		}
	};

	const handleHistory = (id: string | null) => {
		navigate('/history/' + id);
		dispatch(closeModal());
	};

	const handleAddFriend = (id: string | null) => {
		socket.emit('friend_request', {friend_id: id, token: localStorage.getItem('jwtAuthorization')});
	};

	const handleUnFriend = (id: string | null) => {
		socket.emit('unfriend_request', {friend_id: id, token: localStorage.getItem('jwtAuthorization')});
	};

	const handlechallenge = (id: string | null) => {
		socket.emit('challenge', {rival_id: id, token: localStorage.getItem('jwtAuthorization')});
		dispatch(closeModal());
	}

	initialElement.push(
		<div key='ProfilImage'>
			<ProfilImage id={'' + id} OnClickOpenProfil={false} OverwriteClassName=''/>
		</div>
	)

	initialElement.push(
		<div className='score-profil' key='score-profil'>
			<div className='profil-game-info'>
				<p>
					<span className='profil-game-info-title'>Win</span>
					<span>{victories}</span>
				</p>
				<p className='profil-score-middlle-one'>
					<span className='profil-game-info-title'>Loose</span>
					<span>{defeats}</span>
				</p>
				<p>
					<span className='profil-game-info-title'>Ratio</span>
					<span>{defeats === 0 ? (victories === 0 ? 0 : 1) : (victories / defeats).toFixed(2)}</span>
				</p>
			</div>
			<p className='profil-experience'>{experience} XP</p>
		</div>
	)

	if (isMe) {
		initialElement.push(
			<div className='browse-file' key='changeImage'>
				<input type='file' onChange={handleImageChange} id='files'/>
				<label htmlFor='files' className='profil-button'>Change image</label>
			</div>
		)

		initialElement.push(
			<div key='changeName' className='ChangeNameDiv'>
				<ButtonInputToggle
					onInputSubmit={changeName}
					textInButton='Change name'
					placeHolder='New name'
					classInput='profil-button'
					classButton='profil-button'
				/>
			</div>
		)

		initialElement.push(
			<div className='change2FA' key='2FA'>
				<label className='switch'>
					<input type='checkbox' name='2FA' checked={checked} onChange={clicked}/>
					<span className='slider'></span>
				</label>
				<p>2FA</p>
			</div>
		)
		initialElement.push(
			<div key='logout'>
				{errorName && <p className='Error-msg'>{'* ' + errorNameMessage}</p>}
				{errorImageMessage != '' && (<p className='Error-msg'>{'* ' + errorImageMessage}</p>)}
				<div className='logout'>
					<LogoutButton/>
				</div>
			</div>
		)
	}

	function handleChangeBlock() {
		if (isUserBlocked) {
			socket.emit('unblock_user', {unblock_id: id, token: localStorage.getItem('jwtAuthorization')})
		} else {
			socket.emit('block_user', {block_id: id, token: localStorage.getItem('jwtAuthorization')})
		}
	}

	return (
		<div className='profil-modal' >
			<div className='profil-title'>
				<button className='close-profil' onClick={() => dispatch(closeModal())}></button>
				<h2><ProfilName id={id}/></h2>
			</div>
			<div>
				{initialElement}
				{!isMe ? (
					<div className='other-user-profil'>
						{!isFriend ? (
							<>
								<button onClick={() => handleAddFriend(id)}>
									{hasFriendRequest == 1 ? 'accept request' : hasFriendRequest == 2 ? 'waiting' : 'add friend'}
								</button>
								<br/>
								<button onClick={() => handlechallenge(id)}>
									Challenge
								</button>
								<br/>
								<button onClick={() => handleChangeBlock()}>
									{
										isUserBlocked ? (
											'unblock'
										) : 'block'
									}
								</button>
							</>
						) : (
							<>
								<button onClick={() => handleUnFriend(id)}>
									Unfriend
								</button>
								<br/>
								<button onClick={() => handlechallenge(id)}>
									Challenge
								</button>
							</>
						)}
						<br/>
						<button onClick={() => handleHistory(id)}>
							history
						</button>
					</div>
				) : null}
			</div>
			<br/>
		</div>
	)
}

