import './css/endgame.css'
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "../redux/store";
import SocketSingleton from "../socket";
import {setBeginStatus} from '../redux/game/beginToOption';
import ErrorToken from '../components/IfError';


const EndGame = () => {
	const myrevengeRef = useRef(false);
	const [revenge, setRevenge] = useState(false);
	const [myrevenge, setMyrevenge] = useState(false);
	const [replay, setMyReplay] = useState(true);
	const navigate = useNavigate();
	const finalStatus = useSelector((state: RootState) => state.finalGame.finalStatus);
	const socketInstance = SocketSingleton.getInstance();
	const socket = socketInstance.getSocket();
	const dispatch = useDispatch();

	useEffect(() => {
		return () => {
			if (!myrevengeRef.current)
				socket.emit('game_finished', {rematch: false, token: localStorage.getItem('jwtAuthorization')});
		};
	}, [myrevenge, socket]);

	const homebutton = () => {
		socket.emit('game_finished', {rematch: false, token: localStorage.getItem('jwtAuthorization')});
		navigate('/home');
	}

	const launchReplay = useCallback(() => {
		socket.emit('game_finished', {rematch: true, token: localStorage.getItem('jwtAuthorization')});
	}, [socket]);


	const replaybutton = () => {
		myrevengeRef.current = true;
		socket.emit('game_finished', {rematch: true, token: localStorage.getItem('jwtAuthorization')})
		if (!revenge)
			setMyrevenge(true);
	}

	useEffect(() => {

		socket.on('game_found', (data) => {
			dispatch(setBeginStatus({decide: data.decide, playerstate: data.user, gameid: data.game_id, gamestate: 1}));
			navigate("/optiongame")
		});

		socket.on('rematch', (any: { rematch: any; }) => {
			const rematch = any.rematch;
			if (rematch) {
				if (myrevenge) {
					launchReplay();
				} else
					setRevenge(true);
			} else {
				setMyReplay(false);
			}
		});
		return () => {
			socket.off('rematch')
			/*socket.off('game_found')*/
		}
	}, [dispatch, launchReplay, myrevenge, navigate, socket])
	useEffect(() => {

		if (finalStatus == null || finalStatus.adversary == null) {
			socket.emit('leave_game', {token: localStorage.getItem('jwtAuthorization')})
			navigate('/home');
		}
	}, [finalStatus, navigate, socket]);


	return (
		<>
			<ErrorToken/>
			<div className="end_game">
				<h1 className="end_game_title">{"you " + finalStatus?.status + " against " + finalStatus?.adversary}</h1>
				<div className="end_game_buttons">
					{revenge &&
                        <p>your opponent wants revenge</p>}

					{myrevenge && replay &&
                        <p>request taken</p>}

					{replay && !myrevenge &&
                        <button className='end_game_button' onClick={replaybutton}>Replay</button>}
					<button className='end_game_button' onClick={homebutton}> Home</button>
				</div>
			</div>
		</>
	);
}

export default EndGame;
