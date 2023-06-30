import reportWebVitals from './reportWebVitals';
import {createRoot} from 'react-dom/client';
import App from './App';
import ProfilModal from './components/profil/modal';
import React from 'react';
import {CookiesProvider} from 'react-cookie';
import {BrowserRouter as Router} from 'react-router-dom'
import {Provider} from 'react-redux'; // Importez le composant Provider de react-redux
import store from './redux/store'; // Importez le store Redux

function MainComponent() {

	return (
		<Provider store={store}>
			<CookiesProvider>
				<Router>
					<App/>
					<ProfilModal/>
				</Router>
			</CookiesProvider>
		</Provider>
	);
}

reportWebVitals();
const root = document.getElementById('root');
if (root) {
	const mainRoot = createRoot(root);
	mainRoot.render(<MainComponent/>);
}
