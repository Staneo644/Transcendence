import './css/history.css'
import React, {useCallback, useEffect, useState} from 'react';
import ErrorToken, {setErrorLocalStorage} from '../components/IfError';
import {useNavigate, useParams} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {openModal} from '../redux/modal/modalSlice';
import axios from 'axios';
import {User} from './chat';
import jwtDecode from 'jwt-decode';

interface Game {
	finished: string;
	id: string;
	score1: number;
	score2: number;
	user1: User;
	user2: User;
}

const OneScoreBlock = ({game, playerId}: { game: Game, playerId: string }) => {
	const dispatch = useDispatch();
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

	const [leftImage, setLeftImage] = useState<string>('');
	const [rightImage, setRightImage] = useState<string>('');

	const [leftUser, setLeftUser] = useState<User>(game.user1);
	const [leftScore, setLeftScore] = useState<number>(game.score1);

	const [rightUser, setRightUser] = useState<User>(game.user2);
	const [rightScore, setRightScore] = useState<number>(game.score2);

	const [userWinner, setUserWinner] = useState<number>(1);


	const [messageWinner, setMessageWinner] = useState<string>('');


	useEffect(() => {
		if (game.score2 > game.score1) {
			setUserWinner(2);
		}
		if (playerId == myId) {
			if (game.user2.id == myId) {
				setLeftUser(game.user2);
				setLeftScore(game.score2)
				setRightUser(game.user1);
				setRightScore(game.score1);
				if (userWinner == 2) {
					setMessageWinner('You won');
				} else {
					setMessageWinner('You loose');
				}
			} else {
				if (userWinner == 1) {
					setMessageWinner('You won');
				} else {
					setMessageWinner('You loose');
				}
			}
		} else {
			if (game.user2.id == playerId) {
				setLeftUser(game.user2);
				setLeftScore(game.score2)
				setRightUser(game.user1);
				setRightScore(game.score1);
				if (userWinner == 2) {
					setMessageWinner(game.user2.username + ' won');
				} else {
					setMessageWinner(game.user2.username + ' loose');
				}
			} else {
				if (userWinner == 1) {
					setMessageWinner(game.user1.username + ' won');
				} else {
					setMessageWinner(game.user1.username + ' loose');
				}
			}
		}
	}, [playerId, game, myId, userWinner, leftImage, rightImage, navigate,
		leftScore, rightScore]);

	useEffect(() => {
		axios.get(process.env.REACT_APP_IP + ':3000/user/image/' + playerId, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				const data = response.data;
				setLeftImage(data);
			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				console.error(error);
				navigate('/Error');
				return;
			});
		let image;
		if (game.user1.id == playerId) {
			image = game.user2.id;
		} else {
			image = game.user1.id;
		}
		axios.get(process.env.REACT_APP_IP + ':3000/user/image/' + image, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				const data = response.data;
				setRightImage(data);
			})
			.catch((error) => {
				setErrorLocalStorage('Error ' + error?.response?.status);
				console.error(error);
				navigate('/Error');
				return;
			});
	}, [leftUser, rightUser, navigate, playerId, game, leftScore,
		rightScore]);

	if (messageWinner == '') {
		return null;
	}

	return (
		<div className='score-block'>
			<h3 className='status'>{messageWinner}</h3>
			<div className='history-score'>
				<div className='player'>
					<img className='image' src={leftImage} onClick={() => dispatch(openModal(leftUser.id))}
						title={leftUser.username}></img>
					<p>{leftScore}</p>
				</div>
				<p>against</p>
				<div className='player'>
					<img className='image' src={rightImage} onClick={() => dispatch(openModal(rightUser.id))}
						title={rightUser.username}></img>
					<p>{rightScore}</p>
				</div>
			</div>
		</div>
	);
};

const ListBlockScore = ({userId, username}: { userId: string, username: string }) => {
	const [listGame, setListGame] = useState<Array<Game>>([]);
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
		axios.get(process.env.REACT_APP_IP + ':3000/game/history/' + userId, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
			},
		})
			.then((response) => {
				setListGame(response.data);
			})
			.catch((error) => {
				setErrorLocalStorage(error?.response?.status);
				navigate('/Error');
			})
	}, [navigate, userId]);

	if (listGame == null || listGame.length == 0) {
		if (userId == myId) {
			return (<p className='no-game-played'>{"You don't have played a game yet!"}</p>);
		} else {
			return (<p className='no-game-played'>{username + " has never yet played a game"}</p>);
		}
	}

	return (
		<div className='score-board'>
			{
				listGame.map((itemGame, index) => (
					itemGame.finished == 'FINISHED' ? (
						<div key={index + itemGame.id}>
							<OneScoreBlock
								game={itemGame}
								playerId={userId}
							/>
						</div>
					) : (
						<div key={index + itemGame.id}></div>)
				))
			}
		</div>
	);
}

const History = () => {
	const navigate = useNavigate();
	const [username, setUsername] = useState<string>('');
	const [userId, setUserId] = useState<string>('');
	const {id} = useParams();


	const fetchDataUser = useCallback((userId: string) => {
		if (userId != null) {
			axios.get(process.env.REACT_APP_IP + ':3000/user/id/' + userId, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('jwtAuthorization')}`,
				},
			})
				.then((response) => {
					setUsername(response.data.username);
				})
				.catch((error) => {
					if (error?.response?.status == 401 || error?.response?.status == 500) {
						setErrorLocalStorage('Error ' + error?.response?.status);
						navigate('/Error');
					} else (
						navigate('/home')
					)
				});
		} else {
			navigate('/home');
		}
	}, [navigate, userId, id]);

	useEffect(() => {
		if (id != null) {
			fetchDataUser(id);
			setUserId(id);
		}
	}, [navigate, fetchDataUser, id, userId]);


	if (userId == '' || userId == null) {
		return (null);
	}
	return (
		<div className='page-history'>
			<ErrorToken/>
			<header className='history-title'>
				<div>
					{'Historique'}
				</div>
			</header>
			<div className='scrollBlock'>
				<ListBlockScore userId={userId} username={username}/>
			</div>
		</div>
	);
}

export default History;
