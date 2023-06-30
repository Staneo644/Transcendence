import './css/begingame.css'
import {animated, useSpring} from 'react-spring';
import React, {useEffect, useRef} from 'react';
import SocketSingleton from '../socket';
import {useNavigate} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import {setBeginStatus} from '../redux/game/beginToOption';
import ErrorToken from '../components/IfError';
import {RootState} from '../redux/store';
import loading from '../images/game/loading/loading.png';
import {closeModal} from "../redux/modal/modalSlice";

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();

const BeginGame = () => {

	const gamefound = useRef(false);
	const gamestate = useSelector((state: RootState) => state.beginToOption.gamestate);
	const navigate = useNavigate();
	const dispatch = useDispatch();

	useEffect(() => {
		if (gamestate != 10)
			navigate("/home");
		socket.emit('join_matchmaking', {token: localStorage.getItem('jwtAuthorization')});
		return () => {
			socket.emit('leave_matchmaking', {token: localStorage.getItem('jwtAuthorization')})
		};
	}, [navigate]);

	useEffect(() => {

		socket.on('matchmaking_code', (data: any) => {
			if (!gamefound.current)
				return;
			if (data.code === 0) {
				gamefound.current = true;
			} else {
				navigate("/home");
				alert(data.message);
			}
		});

		socket.on('game_found', (data) => {
			dispatch(closeModal());
			dispatch(setBeginStatus({decide: data.decide, playerstate: data.user, gameid: data.game_id, gamestate: 1}));
			socket.emit('leave_matchmaking')
			navigate("/optiongame")
		});

		return () => {
			socket.emit('leave_matchmaking');
			socket.off('matchmaking_code');
			socket.off('game_found');
		};
	}, [navigate, dispatch]);


	const spinnerAnimation = useSpring({
		from: {transform: 'rotate(0deg)'},
		to: {transform: 'rotate(360deg)'},
		loop: true,
		config: {duration: 4000},
	});

	return (
		<div className='center-page'>
			<ErrorToken/>
			<h2 style={{color: 'white'}}> Searching players... </h2>
			<animated.img src={loading} className={"gameimg"} style={spinnerAnimation}></animated.img>
		</div>
	);
}

export default BeginGame;
