import React from 'react';
import {Link} from 'react-router-dom';

function Reconnect() {
	return (
		<div className='Error-page'>
			<p className='Error-description'>{localStorage.getItem('Error') != 'Error undefined' ? (
				localStorage.getItem('Error') == null || localStorage.getItem('Error') == '' ? (
					"can't acces to api"
				) : (
					localStorage.getItem('Error')
				)
			) : (
				"can't access to back"
			)}
			</p>
			<Link to={process.env.REACT_APP_IP + ':8080'}>
				<button className='login-button'>
					Try to reconnect
				</button>
			</Link>
		</div>
	);
}

export default Reconnect;
