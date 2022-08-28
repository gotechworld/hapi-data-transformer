const template = `<?xml version="1.0" encoding="UTF-8"?>
<!--<%= salesOrder.fileName %>-->
<Envelope xmlns="http://schemas.microsoft.com/dynamics/2011/01/documents/Message">
	<Header>
		<Action>http://tempuri.org/SalesOrder_ATXNService/create</Action>
	</Header>
	<Body>
		<MessageParts xmlns="http://schemas.microsoft.com/dynamics/2011/01/documents/Message">
			<SalesOrder_ATXN xmlns="http://schemas.microsoft.com/dynamics/2008/01/documents/SalesOrder_ATXN">
				<SenderId>ATX</SenderId>
          <SalesOrderHeaderAIF class="entity" xmlns="http://schemas.microsoft.com/dynamics/2008/01/documents/SalesOrder_ATXN">
            <% if (salesOrder.customerErpId) { %>
              <ATXEcomCustomer><%= salesOrder.customerErpId %></ATXEcomCustomer>
            <% } %>
            <% if (salesOrder.originId !== "MAGENTOREZ" && salesOrder.customer) { %>
              <CustAccount><%= salesOrder.customer.id %></CustAccount>
            <% } %>
            <% if (salesOrder.deliveryDate) { %>
              <DeliveryDate><%= salesOrder.deliveryDate %></DeliveryDate>
            <% } %>
            <% if (salesOrder.deliveryInStore > 0) { %>
              <DeliveryInStore>Yes</DeliveryInStore>
            <% } else { %>
              <DeliveryInStore>No</DeliveryInStore>
            <% } %>
            <DeliveryMode><%= salesOrder.deliveryMode %></DeliveryMode>
            <% if (salesOrder.addresses.shipping) { %>
              <DeliveryPhone><%= salesOrder.addresses.shipping.telephone %></DeliveryPhone>
            <% } else { %>
              <DeliveryPhone></DeliveryPhone>
            <% } %>
					  <ExternalSalesId><%= salesOrder.incrementId %></ExternalSalesId>
            <InventLocationId><%= salesOrder.inventoryLocationId %></InventLocationId>
            <% if (salesOrder.originId !== "MAGENTOREZ") { %>
              <% if (salesOrder.customerIsGuest > 0) { %>
                <IsRegisteredCustomer>No</IsRegisteredCustomer>
              <% } else { %>
                <IsRegisteredCustomer>Yes</IsRegisteredCustomer>
              <% } %>
            <% } %>
            <% if (salesOrder.comment) { %>
              <Obs><![CDATA[<%- salesOrder.comment.substring(0, 150) %>]]></Obs>
            <% } else { %>
              <Obs />
            <% } %>
            <% if (salesOrder.payments && salesOrder.payments.length >= 1 && salesOrder.payments[0].additionalData && salesOrder.payments[0].additionalData.ipn_contract_no) { %>
              <PayContractNo><%= salesOrder.payments[0].additionalData.ipn_contract_no %></PayContractNo>
            <% } else { %>
              <PayContractNo></PayContractNo>
            <% } %>
            <% if (salesOrder.originId === 'MAGENTORTL') { %>
              <PaymMode></PaymMode>
            <% } else if (salesOrder.paymentMode > 0) { %>
              <PaymMode><%= salesOrder.paymentMode %></PaymMode>
            <% } else { %>
              <PaymMode></PaymMode>
            <% } %>
            <% if (salesOrder.retailReceiptId > 0) { %>
              <RetailReceiptId><%= salesOrder.retailReceiptId %></RetailReceiptId>
            <% } %>
            <% if (salesOrder.retailTerminalId > 0) { %>
              <RetailTerminalId><%= salesOrder.retailTerminalId %></RetailTerminalId>
            <% } %>
					<SalesAmount><%= salesOrder.grandTotal %></SalesAmount>
					<SalesOrderDate><%= salesOrder.orderDate %></SalesOrderDate>
					<SalesOriginId><%= salesOrder.originId %></SalesOriginId>
            <SalesTaker><%= salesOrder.salesAgentId %></SalesTaker>
            <TaxGroup><%= salesOrder.taxGroupId %></TaxGroup>
            <% salesOrder.items.forEach(function(orderItem) { %>
              <SalesOrderLinesAIF class="entity" xmlns="http://schemas.microsoft.com/dynamics/2008/01/documents/SalesOrder_ATXN">
                <DeliveryMode><%= salesOrder.deliveryMode %></DeliveryMode>
                <ExternalSalesId><%= salesOrder.incrementId %></ExternalSalesId>
                <ExternalSalesLineId><%= orderItem.confirmationItemId %></ExternalSalesLineId>
                <InventLocationId><%= orderItem.inventoryLocationId %></InventLocationId>
                <ItemId><%- orderItem.sku %></ItemId>
                <% if (orderItem.resealedCode) { %>
                  <ItemSerialNumber><%- orderItem.resealedCode %></ItemSerialNumber>
                <% } %>
                <LineAmount><%- orderItem.rowTotal %></LineAmount>
                <% if (orderItem.rowDiscount > 0) { %>
                  <LineDisc><%- orderItem.rowDiscount %></LineDisc>
                <% } %>
                <SalesOrderedQty><%- orderItem.qty %></SalesOrderedQty>
                <SalesOriginId><%- salesOrder.originId %></SalesOriginId>
                <SalesPrice><%- orderItem.rowSaleTotal %></SalesPrice>
                <% if (orderItem.couponCode && orderItem.couponType) { %>
                  <VoucherNum><%- orderItem.couponCode %></VoucherNum>
                  <VoucherType><%- orderItem.couponType %></VoucherType>
                <% } %>
                <% if (salesOrder.salesAgentId < 2760429463000) { %>
                  <WorkerSalesResponsible><%- salesOrder.salesAgentId %></WorkerSalesResponsible>
                <% } else { %>
                  <WorkerSalesResponsible />
                <% } %>
              </SalesOrderLinesAIF>
            <% }) %>
            <% if (salesOrder.originId !== "MAGENTOREZ") { %>
              <% salesOrder.payments.forEach(function(orderPayment) { %>
                <SalesOrderPaymentsAIF class="entity" xmlns="http://schemas.microsoft.com/dynamics/2008/01/documents/SalesOrder_ATXN">
                  <Amount><%- orderPayment.amountTotal %></Amount>
                  <Currency><%- orderPayment.currency %></Currency>
                  <% if (salesOrder.customer) { %>
                    <CustAccount><%= salesOrder.customer.id %></CustAccount>
                  <% } %>
                  <ExternalSalesId><%= salesOrder.incrementId %></ExternalSalesId>
                  <% if (salesOrder.originId === 'MAGENTORTL') { %>
                    <PaymMode></PaymMode>
                  <% } else if (orderPayment.paymentMethod === 'pay_in_store') { %>
                    <PaymMode><%- orderPayment.additionalData.payment_mode %></PaymMode>
                  <% } else { %>
                    <PaymMode><%- salesOrder.paymentMode %></PaymMode>
                  <% } %>
                </SalesOrderPaymentsAIF>
              <% }) %>
            <% } %>
            <SalesOrderCustomersAIF class="entity" xmlns="http://schemas.microsoft.com/dynamics/2008/01/documents/SalesOrder_ATXN">
              <% if (salesOrder.addresses.billing.companyIban) { %>
                <BankIBAN><![CDATA[<%- salesOrder.addresses.billing.companyIban %>]]></BankIBAN>
              <% } %>
              <% if (salesOrder.addresses.billing.companyBank) { %>
                <BankName><![CDATA[<%- salesOrder.addresses.billing.companyBank %>]]></BankName>
              <% } %>
              <City><![CDATA[<%- salesOrder.addresses.billing.city.substring(0, 60) %>]]></City>
              <CountryRegionId><%- salesOrder.addresses.billing.countryRegionId %></CountryRegionId>
              <County><%- salesOrder.addresses.billing.regionId %></County>
              <% if (salesOrder.customer) { %>
                <CustAccount><%- salesOrder.customer.id %></CustAccount>
              <% } %>
              <CustGroup><%- salesOrder.addresses.billing.clientGroupId %></CustGroup>
              <CustName><![CDATA[<%- salesOrder.addresses.billing.name.substring(0, 100) %>]]></CustName>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvCity><![CDATA[<%- salesOrder.addresses.shipping.city.substring(0, 60) %>]]></DlvCity>
              <% } else { %>
                <DlvCity></DlvCity>
              <% } %>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvCountryRegionId><%- salesOrder.addresses.shipping.countryRegionId %></DlvCountryRegionId>
              <% } else { %>
                <DlvCountryRegionId></DlvCountryRegionId>
              <% } %>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvCounty><%- salesOrder.addresses.shipping.regionId %></DlvCounty>
              <% } else { %>
                <DlvCounty></DlvCounty>
              <% } %>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvName><![CDATA[<%- salesOrder.addresses.shipping.name.substring(0, 100) %>]]></DlvName>
              <% } %>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvState><%- salesOrder.addresses.shipping.countryId %></DlvState>
              <% } else { %>
                <DlvState></DlvState>
              <% } %>
              <% if (salesOrder.addresses.shipping) { %>
                <DlvStreet><![CDATA[<%- salesOrder.addresses.shipping.street.substring(0, 250) %>]]></DlvStreet>
              <% } else { %>
                <DlvStreet></DlvStreet>
              <% } %>
              <Email><![CDATA[<%- salesOrder.addresses.billing.email %>]]></Email>
              <% if (salesOrder.addresses.billing.companyFiscalCode) { %>
                <FiscalCode_RO><![CDATA[<%- salesOrder.addresses.billing.companyFiscalCode %>]]></FiscalCode_RO>
              <% } else if (salesOrder.addresses.billing.socialNo) { %>
                <FiscalCode_RO><![CDATA[<%- salesOrder.addresses.billing.socialNo %>]]></FiscalCode_RO>
              <% } %>
              <% if (salesOrder.addresses.billing.company) { %>
                <InvName><![CDATA[<%- salesOrder.addresses.billing.company.substring(0, 60) %>]]></InvName>
              <% } else { %>
                <InvName><![CDATA[<%- salesOrder.addresses.billing.name.substring(0, 60) %>]]></InvName>
              <% } %>
              <% if (salesOrder.addresses.billing.companyRegNo) { %>
                <OrgNumber><![CDATA[<%- salesOrder.addresses.billing.companyRegNo %>]]></OrgNumber>
              <% } %>
              <Phone><%= salesOrder.addresses.billing.telephone %></Phone>
              <SalesOriginId><%- salesOrder.originId %></SalesOriginId>
              <% if (salesOrder.originId !== "MAGENTOREZ") { %>
                <State><%- salesOrder.addresses.billing.countryId %></State>
              <% } %>
              <Street><![CDATA[<%- salesOrder.addresses.billing.street.substring(0, 250) %>]]></Street>
              <% if (salesOrder.originId !== "MAGENTOREZ") { %>
                <StreetNumber />
              <% } %>
              <TaxGroup><%- salesOrder.addresses.billing.clientGroupId %></TaxGroup>
            </SalesOrderCustomersAIF>
				</SalesOrderHeaderAIF>
			</SalesOrder_ATXN>
		</MessageParts>
	</Body>
</Envelope>`;

exports.template = template;
