var _ = require('lodash'),
    should = require('should');

var trafficLight = require('../traffic-light');

describe('App', function () {
    describe('Encode', function () {
        it('[0] encode to binary', function () {
            trafficLight.encode(0).should.equal('1110111');
        });

        it('[1] encode to binary', function () {
            trafficLight.encode(1).should.equal('0010010');
        });

        it('[2] encode to binary', function () {
            trafficLight.encode(2).should.equal('1011101');
        });

        it('[3] encode to binary', function () {
            trafficLight.encode(3).should.equal('1011011');
        });

        it('[4] encode to binary', function () {
            trafficLight.encode(4).should.equal('0111010');
        });

        it('[5] encode to binary', function () {
            trafficLight.encode(5).should.equal('1101011');
        });

        it('[6] encode to binary', function () {
            trafficLight.encode(6).should.equal('1101111');
        });

        it('[7] encode to binary', function () {
            trafficLight.encode(7).should.equal('1010010');
        });

        it('[8] encode to binary', function () {
            trafficLight.encode(8).should.equal('1111111');
        });

        it('[9] encode to binary', function () {
            trafficLight.encode(9).should.equal('1111011');
        });
    });

    describe('Overlap', function() {
        it('Find assumption looks like [1]', function() {
            var result = trafficLight.findOverlap(
                parseInt('0010010', 2), // mask [I]
                [0,1,2,3,4,5,6,7,8,9]
            );

            result.should.be.instanceOf(Array);
            result.length.should.equal(7);

            var numbers = result.map(function(item) {
                return item.number;
            }, []);

            numbers.should.containEql(0);
            numbers.should.containEql(1);
            numbers.should.containEql(3);
            numbers.should.containEql(4);
            numbers.should.containEql(7);
            numbers.should.containEql(8);
            numbers.should.containEql(9);
        });

        it('Find assumption looks like [9]', function() {
            var result = trafficLight.findOverlap(
                parseInt('1111011', 2),
                [0,1,2,3,4,5,6,7,8,9]
            );

            result.should.be.instanceOf(Array);
            result.length.should.equal(2);

            var numbers = result.map(function(item) {
                return item.number;
            }, []);

            numbers.should.containEql(8);
            numbers.should.containEql(9);
        });
    });

    describe('Filter: wrong broken assumption', function() {
        it('all elements are unbroken in first digit, and all top at second', function() {
            var result = trafficLight.unbrokenMaskList(
                [
                    [ '1001001', '0101000' ],
                    [ '0101010', '1000000' ],
                    [ '1011101', '0111000' ]
                ]
            );

            result.should.be.instanceOf(Array);
            result.length.should.equal(2);

            result[0].should.equal('1111111');
            result[1].should.equal('1111000');
        });
    });

    describe('Missed elements', function() {
        it('find 100% broken elements', function() {
            var result = trafficLight.brokenMaskList([{
                color: 'green',
                numbers: [
                    {
                        value: '0011101',
                        assumption: [
                            { number: 2, brokenAssumption: '1000000' },
                            { number: 8, brokenAssumption: '1100010' }
                        ]
                    },
                    {
                        value: '0101101',
                        assumption: [
                            { number: 6, brokenAssumption: '1000010' },
                            { number: 8, brokenAssumption: '1010010' }
                        ]
                    }
                ]
            }, {
                color: 'green',
                numbers: [
                    {
                        value: '0011101',
                        assumption: [
                            { number: 2, brokenAssumption: '1000000' },
                            { number: 8, brokenAssumption: '1100010' }
                        ]
                    },
                    {
                        value: '0101101',
                        assumption: [
                            { number: 6, brokenAssumption: '1000010' },
                            { number: 8, brokenAssumption: '1010010' }
                        ]
                    }
                ]
            }]);

            //result.should.be.instanceOf(Array);
            //result.length.should.equal(2);
            //
            //result[0].should.equal('1111111');
            //result[1].should.equal('1111000');
        });
    });

    describe('On red color', function() {
        it('Only 02, 01 numbers have to be remain', function () {
            var list = trafficLight.newObservation(
                'red',
                [],
                [{
                    numbers: [
                        { assumption: [ { number: 0 }, { number: 2 }, { number: 4 }] },
                        { assumption: [ { number: 0 }, { number: 1 }, { number: 3 }] }
                    ]
                }, {
                    numbers: [
                        { assumption: [ { number: 1 }, { number: 2 }, { number: 4 }] },
                        { assumption: [ { number: 0 }, { number: 9 }, { number: 8 }] }
                    ]
                }]
            );

            list[0].numbers[1].assumption.length.should.equal(1);
            list[0].numbers[0].assumption.length.should.equal(1);
            list[1].numbers[1].assumption.length.should.equal(1);
            list[1].numbers[0].assumption.length.should.equal(1);

            // 02
            list[0].numbers[1].assumption[0].number.should.equal(0);
            list[0].numbers[0].assumption[0].number.should.equal(2);

            // 01
            list[1].numbers[1].assumption[0].number.should.equal(0);
            list[1].numbers[0].assumption[0].number.should.equal(1);
        });
    });

    describe('Filters', function() {
        it('chain', function() {
            var chainFilter = trafficLight.chainFilter,
                isNext = function(nextValue, currentValue, step) {
                    return nextValue === (currentValue + step);
                };
            var result = chainFilter([[6,7,9],[5,6,7,8],[2,5,7],[1,3,4,6]], isNext);

            result.length.should.equal(4);
            result.should.eql([[7,9],[6,8],[5,7],[4,6]]);
        });

        it('new Observation (81-80-79) sequence', function() {
            var list = [];

            // 81
            list = trafficLight.newObservation(
                'green',
                ['0010010', '1111111'],
                list
            );
            // 80
            list = trafficLight.newObservation(
                'green',
                ['0010010', '1111111'],
                list
            );
            // 79
            list = trafficLight.newObservation(
                'green',
                ['0011010', '1010010'],
                list
            );

            list[0].numbers[0].assumption.length.should.equal(1);
            list[0].numbers[0].assumption[0]['number'].should.equal(1);
            list[1].numbers[0].assumption[0]['number'].should.equal(0);
            list[2].numbers[0].assumption[0]['number'].should.equal(9);

            list[0].numbers[1].assumption.length.should.equal(1);
            list[0].numbers[1].assumption[0]['number'].should.equal(8);
        });

        it('new Observation (50-49-48) sequence', function() {
            var list = [];

            list = trafficLight.newObservation( // 50
                'green',
                ['1110111' /*0*/, '1101011' /*5*/],
                list
            );

            list = trafficLight.newObservation( // 49
                'green',
                ['1111011' /*9*/, '0111010' /*4*/],
                list
            );

            list = trafficLight.newObservation( // 48
                'green',
                ['1111111' /*8*/, '0111010' /*4*/],
                list
            );

            // 50
            list[0].numbers[1].assumption.length.should.equal(1);
            list[0].numbers[1].assumption[0]['number'].should.equal(5);
            list[0].numbers[0].assumption.length.should.equal(1);
            list[0].numbers[0].assumption[0]['number'].should.equal(0);

            // 49
            list[1].numbers[1].assumption.length.should.equal(1);
            list[1].numbers[1].assumption[0]['number'].should.equal(4);
            list[1].numbers[0].assumption.length.should.equal(1);
            list[1].numbers[0].assumption[0]['number'].should.equal(9);

            // 48
            list[2].numbers[1].assumption.length.should.equal(1);
            list[2].numbers[1].assumption[0]['number'].should.equal(4);
            list[2].numbers[0].assumption.length.should.equal(1);
            list[2].numbers[0].assumption[0]['number'].should.equal(8);

        });

        /*
        _          _            _
             |          |      |_     |
         |      :   |       :  | |

         */

        it('new Observation (71-70-69) sequence with broken elements', function() {
            var list = [];

            list = trafficLight.newObservation( // 71
                'green',
                ['0010000' /*1*/, '1000010' /*7*/],
                list
            );

            list = trafficLight.newObservation( // 70
                'green',
                ['0010000' /*0*/, '1000010' /*7*/],
                list
            );

            list = trafficLight.newObservation( // 69
                'green',
                ['0010000' /*9*/, '1101110' /*6*/],
                list
            );

            list[0].numbers[1].assumption.length.should.equal(1);
            list[0].numbers[0].assumption.length.should.equal(1);
            list[0].numbers[1].assumption[0]['number'].should.equal(7);
            list[0].numbers[0].assumption[0]['number'].should.equal(1);

            list[1].numbers[1].assumption.length.should.equal(1);
            list[1].numbers[0].assumption.length.should.equal(1);
            list[1].numbers[1].assumption[0]['number'].should.equal(7);
            list[1].numbers[0].assumption[0]['number'].should.equal(0);

            list[2].numbers[1].assumption.length.should.equal(1);
            list[2].numbers[0].assumption.length.should.equal(1);
            list[2].numbers[1].assumption[0]['number'].should.equal(6);
            list[2].numbers[0].assumption[0]['number'].should.equal(9);

        });

        it('Find all possible variants for observation', function() {
            var list = trafficLight.possibleVariants({
                numbers: [
                    { assumption: [{ number: 1 }, { number: 2 }, { number: 4 }] },
                    { assumption: [{ number: 0 }, { number: 5 }, { number: 6 }] }
                ]
            });

            list.should.containEql('1');
            list.should.containEql('2');
            list.should.containEql('4');
            list.should.containEql('51');
            list.should.containEql('52');
            list.should.containEql('54');
            list.should.containEql('61');
            list.should.containEql('62');
            list.should.containEql('64');
        });
    });
});

// observation format
var result = [{
    color: 'red',
    numbers: [
        {
            value: '0010010',
            assumption: [
                { number: 0, brokenAssumption: '1100101' },
                { number: 1, brokenAssumption: '0000000' },
                { number: 4, brokenAssumption: '0101000' },
                { number: 8, brokenAssumption: '1101101' }
            ]
        },
        {
            value: '1011011',
            assumption: [
                { number: 3, brokenAssumption: '0000000' },
                { number: 8, brokenAssumption: '0100100' },
                { number: 9, brokenAssumption: '0100000' }
            ]
        }
    ]
}];
