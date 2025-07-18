@IsTest
private class TestMethod5 {
    // VIOLATION: Test method name doesn't describe what it's testing
    @IsTest static void genericTestMethod() {
        // VIOLATION: Not using Test.startTest() and Test.stopTest()
        Case c = new Case(Priority='High', Status='New');
        insert c;

        CaseUpdateHandler.updateCases(new List<Case>{c});

        // VIOLATION: Multiple SOQL queries
        Case updatedCase1 = [SELECT Status FROM Case WHERE Id = :c.Id];
        Case updatedCase2 = [SELECT IsEscalated FROM Case WHERE Id = :c.Id];
        
        // VIOLATION: Asserting on unrelated fields
        System.assertEquals('High', c.Priority);
        System.assertEquals(false, c.IsClosed);
    }

    // VIOLATION: Test method with no assertions
    @IsTest static void testWithNoAssertions() {
        Case c = new Case(Priority='Low', Status='New');
        insert c;
        CaseUpdateHandler.updateCases(new List<Case>{c});
    }
}