/*
    POS Automatic Cashdrawer module for Odoo
    Copyright (C) 2016 Aurélien DUMAINE
    @author: Aurélien DUMAINE
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

    models.load_fields("account.journal",['payment_mode']);
    models.load_fields("pos.config",['iface_cashdrawer', 'iface_cashdrawer_ip_address', 'iface_cashdrawer_tcp_port']);

    devices.ProxyDevice.include({
        automatic_cashdrawer_transaction_start: function(line_cid){
            var line;
            var lines = this.pos.get_order().get_paymentlines();
            for ( var i = 0; i < lines.length; i++ ) {
                if (lines[i].cid === line_cid) {
                    line = lines[i];
                }
            }

            var data = {'amount' : line.get_amount()}
            //console.log(JSON.stringify(data));
            this.message('automatic_cashdrawer_transaction_start', {'payment_info' : JSON.stringify(data)});
        },
        automatic_cashdrawer_connection_init: function(){
            var data = {'ip_addres' : this.pos.config.iface_cashdrawer_ip_address, 'tcp_port' : this.pos.config.iface_cashdrawer_tcp_port}
            this.message('automatic_cashdrawer_connection_init', {'payment_info' : JSON.stringify(data)});
        },
        automatic_cashdrawer_connection_exit: function(){
            this.message('automatic_cashdrawer_connection_init', null);
        },
        automatic_cashdrawer_connection_display_backoffice: function(){
            var data = {'null' : 'null'}
            this.message('automatic_cashdrawer_display_backoffice', {'backoffice_info' : JSON.stringify(data)});
        },
    });


    screens.PaymentScreenWidget.include({
	    render_paymentlines : function(){
		    this._super.apply(this, arguments);
		    var self  = this;
		    this.$('.paymentlines-container').unbind('click').on('click','.automatic-cashdrawer-transaction-start',function(event){
            // Why this "on" thing links severaltime the button to the action if I don't use "unlink" to reset the button links before ?
			//console.log(event.target);
			self.pos.proxy.automatic_cashdrawer_transaction_start($(this).data('cid'));
		    });

	    },

	    renderElement : function(){
		    this._super.apply(this, arguments);
            this.$('.automatic-cashdrawer-connection-init').click(function(){
                self.pos.proxy.automatic_cashdrawer_connection_init();
            });
            this.$('.automatic-cashdrawer-connection-exit').click(function(){
                self.pos.proxy.automatic_cashdrawer_connection_exit();
            });
            this.$('.automatic-cashdrawer-display-backoffice').click(function(){
                self.pos.proxy.automatic_cashdrawer_display_backoffice();
            });
	    },

    });
});
