/*
    POS Payment Terminal module for Odoo
    Copyright (C) 2014-2016 Aurélien DUMAINE
    Copyright (C) 2014-2015 Akretion (www.akretion.com)
    @author: Aurélien DUMAINE
    @author: Alexis de Lattre <alexis.delattre@akretion.com>
    The licence is in the file __openerp__.py
*/

odoo.define('pos_payment_terminal.pos_payment_terminal', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var devices = require('point_of_sale.devices');
    var models = require('point_of_sale.models');
//    var gui = require('point_of_sale.gui');
    var core = require('web.core');
    var _t = core._t;
    var QWeb = core.qweb;

    models.load_fields("account.journal", ['payment_mode']);

    models.Paymentline = models.Paymentline.extend({
        get_automatic_payment_terminal: function() {
            if (this.cashregister.journal.payment_mode == 'card' && this.pos.config.iface_payment_terminal) {
                return true;
            }
            else {
                return false;
            }
        },
    });
    models.Order = models.Paymentline.extend({
        add_paymentline: function(cashregister) {
            this.assert_editable();
            var newPaymentline = new exports.Paymentline({},{order: this, cashregister:cashregister, pos: this.pos});
            var auto = false;
            if (cashregister.journal.payment_mode == 'card' && pos.config.iface_payment_terminal) {
                auto = true;
            }
            console.log(auto);
            if(cashregister.journal.type !== 'cash' || this.pos.config.iface_precompute_cash){
//                if (!auto) {
                    newPaymentline.set_amount( Math.max(this.get_due(),0) );
//                }
            }
            this.paymentlines.add(newPaymentline);
            this.select_paymentline(newPaymentline);
        },
    });

//    devices.ProxyDevice.include({
//        payment_terminal_transaction_start: function(line_cid, currency_iso){
//            var line;
//            var lines = this.pos.get_order().get_paymentlines();
//            for ( var i = 0; i < lines.length; i++ ) {
//                if (lines[i].cid === line_cid) {
//                    line = lines[i];
//                }
//            }
//
//            var data = {'amount' : line.get_amount(),
//                        'currency_iso' : currency_iso,
//                        'payment_mode' : line.cashregister.journal.payment_mode};
//            //console.log(JSON.stringify(data));
//            this.message('payment_terminal_transaction_start', {'payment_info' : JSON.stringify(data)});
//        },
//    });
//
//
//    screens.PaymentScreenWidget.include({
//	    render_paymentlines : function(){
//		this._super.apply(this, arguments);
//		    var self  = this;
//		    this.$('.paymentlines-container').unbind('click').on('click','.payment-terminal-transaction-start',function(event){
//            // Why this "on" thing links severaltime the button to the action if I don't use "unlink" to reset the button links before ?
//			//console.log(event.target);
//			self.pos.proxy.payment_terminal_transaction_start($(this).data('cid'), self.pos.currency.name);
//		    });
//
//	    },
//
//    });

    devices.ProxyDevice.include({
        payment_terminal_transaction_start: function(screen, currency_iso){
            var order = this.pos.get_order();
            var line = order.selected_paymentline;
//            for ( var i = 0; i < lines.length; i++ ) {
//                if (lines[i].cid === line_cid) {
//                    line = lines[i];
//                }
//            }
            var data = {
                    'amount' : order.get_due(line),
                    'currency_iso' : currency_iso,
                    'payment_mode' : line.cashregister.journal.payment_mode
                    };
            //console.log(JSON.stringify(data));
            this.message('payment_terminal_transaction_start', {'payment_info' : JSON.stringify(data)});
        },
    });

    screens.PaymentScreenWidget.include({
        click_paymentmethods: function(id) {
            var self = this;
            this._super.apply(this, arguments);
            var line = this.pos.get_order().selected_paymentline;
            var auto = line.get_automatic_payment_terminal();
            if (auto) {
                this.pos.proxy.payment_terminal_transaction_start(self, self.pos.currency.name);
            }
        },
    });
});
