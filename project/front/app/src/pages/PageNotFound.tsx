import './css/PageNotFound.css'
import React from 'react';
import ErrorToken from '../components/IfError';

function NotFound() {
	return (
		<div className='Error-page'>
			<ErrorToken/>
			<h1 className='Error-404'>404</h1>
			<h3 className='Error-description'>Page not found!!!</h3>
		</div>
	);
}

export default NotFound;
