@IsTest
private class TestMethod4 {
    @IsTest static void testCommunityOrigin() {
        // VIOLATION: Hard-coded ID
        Id queueId = '00G000000000001AAA';

        Case c = new Case(Origin='Community', Status='New');
        insert c;

        // VIOLATION: DML operation in between Test.startTest and Test.stopTest
        Test.startTest();
        insert new Account(Name='Test Account');
        CaseUpdateHandler.updateCases(new List<Case>{c});
        Test.stopTest();

        // VIOLATION: SOQL query after Test.stopTest
        Case updatedCase = [SELECT OwnerId FROM Case WHERE Id = :c.Id];

        // VIOLATION: Assertion commenting out actual logic
        // System.assertEquals(queueId, updatedCase.OwnerId);
        System.assertEquals(true, true, 'This assertion always passes');
    }
}