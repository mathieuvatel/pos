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
    models.Order = models.Order.extend({
        add_paymentline: function(cashregister) {
            this.assert_editable();
            var newPaymentline = new models.Paymentline({},{order: this, cashregister:cashregister, pos: this.pos});
            var auto = newPaymentline.get_automatic_payment_terminal();
            if (cashregister.journal.type !== 'cash' || this.pos.config.iface_precompute_cash) {
                if (!auto) {
                    newPaymentline.set_amount( Math.max(this.get_due(), 0) );
                }
            }
            this.paymentlines.add(newPaymentline);
            this.select_paymentline(newPaymentline);
        },
    });

});
