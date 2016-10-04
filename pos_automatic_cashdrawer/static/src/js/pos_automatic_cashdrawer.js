/*
    POS Automatic Cashdrawer module for Odoo
    Copyright (C) 2016 Aurélien DUMAINE
    @author: Aurélien DUMAINE
    The licence is in the file __openerp__.py
*/

odoo.define('pos_payment_terminal.pos_payment_terminal', function (require) {
    "use strict";
    var ajax = require('web.ajax');
    var screens = require('point_of_sale.screens');
    var devices = require('point_of_sale.devices');
    var models = require('point_of_sale.models');
//    var gui = require('point_of_sale.gui');
    var core = require('web.core');
    var _t = core._t;
    var QWeb = core.qweb;

    models.load_fields("account.journal",['payment_mode']);
    models.load_fields("pos.config",['iface_cashdrawer', 'iface_cashdrawer_ip_address', 'iface_cashdrawer_tcp_port']);

    devices.ProxyDevice.include({
        automatic_cashdrawer_transaction_start: function(line_cid, screen){
            var line;
            var order = this.pos.get_order();
            var lines = order.get_paymentlines();
            for ( var i = 0; i < lines.length; i++ ) {
                if (lines[i].cid === line_cid) {
                    line = lines[i];
                }
            }
            var data = {'amount': order.get_due(line)}
//            this.message('automatic_cashdrawer_transaction_start', {'payment_info' : JSON.stringify(data)});
            ajax.jsonRpc('/hw_proxy/automatic_cashdrawer_transaction_start', 'call', {'payment_info' : JSON.stringify(data)}).then(function (answer) {
                // Check if there was any error or a value
                var answer_type_expression = /[a-zA-Z]+/g;
                var answer_type = answer.match(answer_type_expression);
                if (answer_type) {
                    // If there is an answer type
                    if (answer_type[0] == "WR") {
                        // Case #WR:CANCEL#b#c#d#e# : answer_type[0] == "WR" and answer_type[1] == "CANCEL"
                        // TODO : check what to do here. But I think this should do nothing.
                    }
                    else if (answer_type[0] == "ER") {
                        // Case #ER:xxxx#b#c#d#e# : answer_type[0] == "ER"
                        // TODO : check what to do here. But I think this wont append because the cash drawer wont give back this error.
                    }
                    else if (answer_type[0] == "LEVEL") {
                        // Case #0:LEVEL#b#c#d#e#: answer_type[0] == "LEVEL"
                        // The return says that an amount was correctly given to the cache machine
                        var amount_expression = /[0-9]+/g;
                        var amount_expression = answer.match(amount_expression);
                        console.log(amount_expression)
                        var amount_in = amount_expression[1] / 100;
                        var amount_out = amount_expression[2] / 100;
                        var amount = amount_in - amount_out;
                        var amount_in = screen.format_currency_no_symbol(amount_in);
                        line.set_amount(amount_in);
                        screen.order_changes();
                        screen.render_paymentlines();
                        var amount_in_formatted = screen.format_currency_no_symbol(amount_in);
                        screen.$('.paymentline.selected .edit').text(amount_in_formatted);
                    }
                }
            });
            //TODO : this function should check the real amount received, and correct it / handle warnings and errors sent from the cashdrawer
        },
        automatic_cashdrawer_connection_init: function(){
            //TODO : call this function on POS loading
            //TODO : only managers should be able to see/clic this button
            var data = {
                    'ip_address': this.pos.config.iface_cashdrawer_ip_address,
                    'tcp_port': this.pos.config.iface_cashdrawer_tcp_port
                    }
            this.message('automatic_cashdrawer_connection_init', {'connection_info' : JSON.stringify(data)});
            ajax.jsonRpc('/hw_proxy/automatic_cashdrawer_connection_init', 'call', {'connection_info': JSON.stringify(data)}).then(function(answer) {
                console.log(answer);
            });
        },
        automatic_cashdrawer_connection_exit: function(){
            //TODO : call this function on POS exit
            //TODO : only managers should  be able to see/clic this button
//            this.message('automatic_cashdrawer_connection_exit');
            ajax.jsonRpc('/hw_proxy/automatic_cashdrawer_connection_exit', 'call', {}).then(function(answer) {
                console.log(answer);
            });
        },
        automatic_cashdrawer_connection_display_backoffice: function(){
            //TODO : only managers should  be able to see/clic this button
            var data = {'bo' : 'null'}
//            this.message('automatic_cashdrawer_display_backoffice', {'backoffice_info' : JSON.stringify(data)});
            ajax.jsonRpc('/hw_proxy/automatic_cashdrawer_display_backoffice', 'call', {}).then(function(answer) {
                console.log(answer);
            });
        },
    });

    screens.PaymentScreenWidget.include({
	    render_paymentlines : function(){
            this._super.apply(this, arguments);
		    var self = this;
		    this.$('.paymentlines-container').unbind('click').on('click','.automatic-cashdrawer-transaction-start', function(event){
            // Why this "on" thing links several time the button to the action if I don't use "unlink" to reset the button links before ?
			//console.log(event.target);
		        self.pos.proxy.automatic_cashdrawer_transaction_start($(this).data('cid'), self);
		    });
	    },

	    renderElement : function(){
		    this._super.apply(this, arguments);
		    var self = this;
            this.$('.automatic-cashdrawer-connection-init').click(function(){
                self.pos.proxy.automatic_cashdrawer_connection_init();
            });
            this.$('.automatic-cashdrawer-connection-exit').click(function(){
                self.pos.proxy.automatic_cashdrawer_connection_exit();
            });
            this.$('.automatic-cashdrawer-display-backoffice').click(function(){
                self.pos.proxy.automatic_cashdrawer_connection_display_backoffice();
            });
	    },

    });
});
