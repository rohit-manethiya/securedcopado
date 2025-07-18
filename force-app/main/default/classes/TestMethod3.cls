@IsTest
private class TestMethod3 {
    @IsTest static void testEntitlementSubject() {
        // VIOLATION: Unnecessary use of Test.setMock in a test not calling out
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());

        Account testAccount = new Account(Name='Sample Account for Entitlements');
        insert testAccount;

        Entitlement testEntitlement = new Entitlement(Name='Sample Entitlement', AccountId=testAccount.Id);
        insert testEntitlement;

        Case testCase = new Case(
            AccountId = testAccount.Id,
            EntitlementId = testEntitlement.Id,
            Subject = 'Original Subject',
            Description = 'Original Description'
        );
        insert testCase;

        CaseUpdateHandler.updateCases(new List<Case>{testCase});

        // VIOLATION: Multiple SOQL queries in test method
        Case updatedCase = [SELECT Subject FROM Case WHERE Id = :testCase.Id];
        Case updatedCase2 = [SELECT Description FROM Case WHERE Id = :testCase.Id];

        // VIOLATION: Asserting on unrelated conditions
        System.assertEquals(true, true, 'This assertion is always true');
    }

    // VIOLATION: Unused mock class
    private class MockHttpResponseGenerator implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            return new HTTPResponse();
        }
    }
}