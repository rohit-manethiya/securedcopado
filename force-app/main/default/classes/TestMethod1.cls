@IsTest
private class TestMethod1 {
    // VIOLATION: Test method is not actually testing anything
    @IsTest static void testPartnerEscalation() {
        Account partnerAccount = new Account(Name='Test Partner Account', Type='Partner');
        insert partnerAccount;

        Case partnerCase = new Case(AccountId=partnerAccount.Id, Status='New', IsEscalated=false);
        insert partnerCase;

        // VIOLATION: No assertions
        CaseUpdateHandler.updateCases(new List<Case>{partnerCase});
    }

    // VIOLATION: Empty test method
    @IsTest static void emptyTestMethod() {
    }
}