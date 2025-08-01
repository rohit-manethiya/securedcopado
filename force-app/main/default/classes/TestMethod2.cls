@IsTest
private class TestMethod2 {
    @IsTest static void testContactOptOut() {
        // VIOLATION: Test data creation in the test method
        Contact testContact = new Contact(LastName='Doe', HasOptedOutOfEmail=true);
        insert testContact;
        
        Case testCase = new Case(ContactId=testContact.Id, Description='Initial');
        insert testCase;

        // VIOLATION: No Test.startTest() and Test.stopTest()
        CaseUpdateHandler.updateCases(new List<Case>{testCase});

        // VIOLATION: Query in test method
        testCase = [SELECT Description FROM Case WHERE Id = :testCase.Id];
        
        // VIOLATION: System.assert instead of System.assertEquals
        System.assert(testCase.Description == 'Phone Call ONLY - Initial');
    }
}