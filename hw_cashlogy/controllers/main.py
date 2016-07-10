# -*- encoding: utf-8 -*-
##############################################################################
#
#    Hardware Telium Payment Terminal module for Odoo
#    Copyright (C) 2014 Akretion (http://www.akretion.com)
#    @author Alexis de Lattre <alexis.delattre@akretion.com>
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################


import logging
import simplejson
import time
import curses.ascii
from threading import Thread, Lock
from Queue import Queue
from serial import Serial
import openerp.addons.hw_proxy.controllers.main as hw_proxy
from openerp import http
from openerp.tools.config import config


logger = logging.getLogger(__name__)


class CashlogyAutomaticCashdrawerDriver(Thread):
    def __init__(self):
        Thread.__init__(self)
        self.lock = Lock()
        self.status = {'status': 'connecting', 'messages': []}
        self.device_name = "Cashlogy automatic cashdrawer"
        self.socket = False

    def get_status(self):
        return self.status

    def set_status(self, status, message=None):
        if status == self.status['status']:
            if message is not None and message != self.status['messages'][-1]:
                self.status['messages'].append(message)
        else:
            self.status['status'] = status
            if message:
                self.status['messages'] = [message]
            else:
                self.status['messages'] = []

        if status == 'error' and message:
            logger.error('Payment Terminal Error: '+message)
        elif status == 'disconnected' and message:
            logger.warning('Disconnected Terminal: '+message)

    def send_to_cashdrawer(self, msg):
        if (self.socket != False) :
            try:
                BUFFER_SIZE = 1024
                answer = "ok"
#                self.socket.send(msg)
#                answer = self.socket.recv(BUFFER_SIZE)
                logger.debug(answer)
                return answer
            except Exception, e:
                logger.error('Impossible to send to cashdrawer: %s' % str(e))

    def cashlogy_connection_init(self, connection_info):
        '''This function initialize the cashdrawer.
        '''
        connection_info_dict = simplejson.loads(connection_info)
        assert isinstance(connaction_info_dict, dict), \
            'connection_info_dict should be a dict'
#        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
#        self.socket.connect((connection_info_dict['ip_address'], connection_info_dict['tcp_port']))
        answer = self.send_to_cashdrawer("#I#")
        return answer

    def cashlogy_connection_exit(self):
        '''This function close the connection with the cashdrawer.
        '''
        answer = self.send_to_cashdrawer("#E#")
        return answer

    def display_backoffice(self, backoffice_info):
        '''This function display the backoffice on the cashier screen.
        '''
        backoffice_info_dict = simplejson.loads(backoffice_info)
        assert isinstance(backoffice_info_dict, dict), \
            'backoffice_info_dict should be a dict'
        answer = self.send_to_cashdrawer("#G#1#1#1#1#1#1#1#1#1#1#1#1#1#")
        return answer

    def transaction_start(self, payment_info):
        '''This function sends the data to the serial/usb port.
        '''
        payment_info_dict = simplejson.loads(payment_info)
        assert isinstance(payment_info_dict, dict), \
            'payment_info_dict should be a dict'
        amount = str(payment_info['amount'] * 100) #amount is sent in cents to the cashdrawer
        operation_number = "42"
        display_accept_button = "0"
        screen_on_top= "0"
        see_customer_screen = "0"
        answer = self.send_to_cashdrawer("#C#"+operation_number+"#1#"+str(amount)+"#"+see_customer_screen+"#15#15#"+display_accept_button+"#1#"+screen_on_top+"#0#0#")
        return answer


driver = CashlogyAutomaticCashdrawerDriver()

hw_proxy.drivers['cashlogy_automatic_cashdrawer'] = driver


class CashlogyAutomaticCashdrawerProxy(hw_proxy.Proxy):
    @http.route(
        '/hw_proxy/automatic_cashdrawer_connection_init',
        type='json', auth='none', cors='*')
    def automatic_cashdrawer_connection_init(self, connection_info):
        logger.debug(
            'Cashlogy: Call automatic_cashdrawer_connexion_init with '
            'connection_info=%s', connection_info)
        answer = driver.cashlogy_connection_init(connection_info)
        return {'info': str(answer)}

    @http.route(
        '/hw_proxy/automatic_cashdrawer_connection_exit',
        type='json', auth='none', cors='*')
    def automatic_cashdrawer_connection_exit(self):
        logger.debug(
            'Cashlogy: Call automatic_cashdrawer_connexion_exit')
        answer = driver.cashlogy_connection_exit()
        return {'info': str(answer)}

    @http.route(
        '/hw_proxy/automatic_cashdrawer_transaction_start',
        type='json', auth='none', cors='*')
    def automatic_cashdrawer_transaction_start(self, payment_info):
        logger.debug(
            'Cashlogy: Call automatic_cashdrawer_transaction_start with '
            'payment_info=%s', payment_info)
        answer = driver.transaction_start(payment_info)
        return {'info': str(answer)}

    @http.route(
        '/hw_proxy/automatic_cashdrawer_display_backoffice',
        type='json', auth='none', cors='*')
    def automatic_cashdrawer_display_backoffice(self, backoffice_info):
        logger.debug(
            'Cashlogy: Call automatic_cashdrawer with '
            'backoffice_info=%s', backoffice_info)
        answer = driver.display_backoffice(backoffice_info)
        return {'info': str(answer)}

