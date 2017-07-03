'use strict';
const React = require('react');
const Store = require('./store');
const Actions = require('./actions')
const CommentForm = require('../comment-form.jsx');
const LinkState = require('../../../../helpers/link-state');
const PropTypes = require('prop-types');
const TextControl = require('../../../../components/form/text-control.jsx');
const tagImageHash = require('../../../../../data/tag_hash.json');
const PredictionForm = require('./prediction-form.jsx')

class NewPredictionPage extends React.Component {
    constructor(props) {

        super(props);

        this.state = Store.getState();
    }

    componentDidMount() {

        this.unsubscribeStore = Store.subscribe(this.onStoreChange.bind(this));
    }

    componentWillUnmount() {

        this.unsubscribeStore();
    }

    onStoreChange() {

        this.setState(Store.getState());
    }

    render() {
        return (
            <section className="container">
                <h1 className="page-header">
                    Wager Your Coin
                </h1>
                <div className="row">
                    <div className="col-sm-6">
                        <p className="extra-margin">
                            <span>Will Arya and Sansa reunite?  Will Bran fight the Night King as a warg?  What depravity will George R.R. Martin show us this season? If you have a hunch, write down each prediction for season 7 and wager points on how sure you are.  If others agree, they might just wager some of their coins too.  If not, they may troll you in the comments section.  The night is dark and full of terrors. Learn more about wagers here-</span>
                            <a href="/account/criteria" className="fa fa-external-link"/>
                        </p>
                        <PredictionForm {...this.state.prediction} />
                    </div>
                    <div className="col-sm-2"></div>
                    <div className="col-sm-4 rules">
                        <h4>Rules of Engagement</h4>
                        <ul>
                        <li>Each player has 100 coins to start with</li>
                        <li>Write predictions for GoT Season 7</li>
                        <li>You must wager on each prediction you write</li>
                        <li>You can also bet coin on others predictions</li>
                        <li>Heckle</li>
                        <li>Get heckled</li>
                        <li>If the thing happens, coins go to your bank</li>
                        <li>The admin is the approver of wagers and awards</li>
                        <li>Biggest bank roll at the end wins</li>
                        <li>Biggest house bank roll at the end wins</li>
                        <li>There are no real winners in GoT</li>
                       
                        
                        </ul>
                   </div>
                </div>
            </section>
        );
    }
}

module.exports = NewPredictionPage;
