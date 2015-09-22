var _ = require('lodash');

var zeroPad = function(n, width) {
    width = width || 7;
    n = '' + n;
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
};

// analyse collected statistics and create decision concerning 100% UNBROKEN elements
// input : [['1000111', '1001110'], ['1001000', '1010101'], ...]
// output: ['1001111', '1011111']
var unbrokenMaskList = function(maskList) {
    return maskList.reduce(function(result, masks) {
        return masks.map(function(mask, index) {
            return (parseInt(mask, 2) | (parseInt(result[index], 2) || 0)).toString(2);
        });
    }, []);
};

var brokenMaskList = function(list) {
    // analyse collected statistics and create decision concerning 100% BROKEN elements
    var brokenMask = function(observation) {
        return observation.numbers.map(function(number) {
            return _.pluck(number.assumption, 'brokenAssumption').reduce(function(brokenMask, mask) {
                return (brokenMask === null ? mask : zeroPad((parseInt(brokenMask, 2) & parseInt(mask, 2)).toString(2)));
            }, null);
        });
    };

    return list.map(brokenMask).reduce(function(result, masks) {
        return (result.length === 0) ? masks : _.zipWith(result, masks, function(a, b) {
            return zeroPad(
                (parseInt(a, 2) | parseInt(b, 2)).toString(2)
            );
        });
    }, []);
};

var chainFilter = function(list, isNext) {
    var next = function(value, list, step) {
        return list.reduce(function(result, item) {
            if (isNext(item, value, step)) {
                result.push(item);
            }
            return result;
        }, [])[0];
    };

    // for example element: 8; list: [[6,7], [5,6,7], [2,5]]; answer = [8,7,6,5]
    var chain = function chain(element, list) {
        return (typeof element !== 'undefined' ? [element] : []).concat(
            (typeof element !== 'undefined'&& list.length ? chain(
                next(element, list[0], -1), list.slice(1)
            ): [])
        );
    };

    return _.zip.apply(null,
        (_.first(list).map(function(element) {
            return chain(element, _.rest(list));
        })).reduce(function(result, chain) {
            if (chain.length === list.length) {
                result.push(chain);
            }
            return result;
        }, [])
    );
};

/*
     break           break
 -  -  |  -  ...    -  |  -

 31 30 29 28  ...   20 19 18
 */
var filterSecondRankDigit = function(list) {
    var oIndex = _.findIndex(list, function(observation, index) {
        return (
            (observation.numbers[0].assumption.length === 1 && observation.numbers[0].assumption[0] === 9) ||
            (index && list[index - 1].numbers[1].value !== observation.numbers[1].value)) === true;
    });

    if (oIndex === -1) {
        return list;
    }

    var chains = list.reduce(function(result, observation, index) {
        if (index === oIndex) {
            result.groupIndex += 1;
            oIndex += 10;
        }
        result.items[result.groupIndex] = ((typeof result.items[result.groupIndex] === 'undefined') ?
            [observation] : result.items[result.groupIndex].concat(observation)
        );
        return result;
    }, {
        items: [], groupIndex: 0  // default
    })['items'];

    var assumptionChain = chainFilter(
        chains.map(function(c) {
            return _.first(c).numbers[1].assumption;
        }),
        function(nextValue, currentValue, step) {
            return (currentValue.number === 0 ? (nextValue.number === (10 + step)) : nextValue.number === (currentValue.number + step));
        }
    );
    return chains.reduce(function(result, group, index) {
        var x = group.map(function(observation) {
            return _.assign({}, observation, { numbers: observation.numbers.map(function(number, i) {
                return _.assign({}, number, (i !== 1 ? {} : { assumption: assumptionChain[index] } ));
            }) } );
        });
        return result.concat(x);
    }, []);
};

/*
  _         _    _           _     _    _     _     _
 | |   |    _|   _|   |_|   |_    |_     |   |_|   |_|
 |_|   |   |_    _|     |    _|   |_|    |   |_|    _|
 */
var encode = function(num) {
    switch (num.toString()) {
        case '0':
            return '1110111';
        case '1':
            return '0010010';
        case '2':
            return '1011101';
        case '3':
            return '1011011';
        case '4':
            return '0111010';
        case '5':
            return '1101011';
        case '6':
            return '1101111';
        case '7':
            return '1010010';
        case '8':
            return '1111111';
        case '9':
            return '1111011';
        default:
            throw new Error('Unexpected num [' + num + ']');
    }
};

var findOverlap = function(mask, numbers) {
    mask = ((typeof mask === 'string') ? parseInt(mask,2) : mask); // to binary number
    return numbers.reduce(function(result, num) {
        var binary = parseInt(encode(num),2);
        if ((binary & mask) === mask) {
            result.push({
                number: parseFloat(num),
                brokenAssumption: zeroPad((binary ^ mask).toString(2))
            });
        }
        return result;
    }, []);
};

var wrongBrokenAssumptionFilter = function(list, unbrokenMask) {
    return list.reduce(function(result, assumption) {
        if (!(parseInt(assumption.brokenAssumption, 2) & parseInt(unbrokenMask, 2))) {
            result.push(assumption);
        }
        return result;
    }, []);
};

var assumptionFilter = function(list, filter) {
    return list.map(function(observation, index) {
        return _.assign(
            {},
            observation,
            {
                numbers: observation.numbers.map(function(number, i) {
                    return _.assign({}, number, { assumption: filter(number.assumption, i, index) });
                })
            }
        );
    });
};

var countUp = function countUp(list, seconds) {
    seconds = seconds || 1;
    var index = (list.length - 1) - (seconds - 1),
        reverse = function(value) {
            return value.split('').reverse().join('');
        };

    return (typeof list[index] === 'undefined' ?
        list :
        countUp(
            assumptionFilter(
                list,
                function(assumption, numberIndex, listIndex) { // filter by possible second corresponding to rank
                    return (index !== listIndex ? assumption : _.filter(
                        assumption,
                        { number: parseInt(reverse(zeroPad(seconds, 2))[numberIndex], 10) }
                    ));
                }
            ),
            (seconds + 1)
        )
    );
};

var possibleVariants = function(observation) { // for 2 digit numbers only
    return observation.numbers[1].assumption.reduce(function(result, n1) {
        return result.concat(
            observation.numbers[0].assumption.map(function(n0) {
                return (n1.number || '') + '' + n0.number;
            })
        );
    }, []);
};

var filterOneSecondChange = function(list) {
    var assumptionChain = chainFilter(
        list.map(function(observation) {
            return observation.numbers[0].assumption;
        }),
        function(nextValue, currentValue, step) {
            return (currentValue.number === 0 ? (nextValue.number === (10 + step)) : nextValue.number === (currentValue.number + step));
        }
    );
    return assumptionFilter(
        list,
        function(assumption, numberIndex, listIndex) {
            return (numberIndex === 0 ? assumptionChain[listIndex] : assumption);
        }
    );
};

var filterUnbrokenMask = function(list, next) {
    var unbrokenMasks = unbrokenMaskList(
        _.pluck(list, 'numbers').map(function(numbers) {
            return _.pluck(numbers, 'value');
        })
    );

    return assumptionFilter(
        list,
        function(assumption, numberIndex) {
            return wrongBrokenAssumptionFilter(assumption, unbrokenMasks[numberIndex]);
        }
    );
};

var addToList = function(digits, list) {
    var isSecondDigitChanged = function(value, list) {
        return typeof _.last(list) !== 'undefined' && _.last(list).numbers[1].value !== value;
    };

    return list.concat([{
        numbers: [{
            value: digits[0],
            assumption: findOverlap(digits[0], (isSecondDigitChanged(digits[1], list) ? [9] : [0,1,2,3,4,5,6,7,8,9]))
        }, {
            value: digits[1],
            assumption: findOverlap(digits[1], [0,1,2,3,4,5,6,7,8,9])
        }]
    }]);
};

var newObservation = function(color, digits, list) {
    if (color === 'red') {
        return countUp(list);
    }

    var transform = function transform(list, fxList) {
        return _.isEmpty(fxList) ? list : transform(_.first(fxList)(list), _.rest(fxList));
    };

    return transform(
        (_.isEmpty(digits) ? list : addToList(digits, list)),
        [filterUnbrokenMask, filterOneSecondChange, filterSecondRankDigit]
    );
};

module.exports.filterUnbrokenMask = filterUnbrokenMask;
module.exports.newObservation = newObservation;
module.exports.findOverlap = findOverlap;
module.exports.brokenMaskList = brokenMaskList;
module.exports.unbrokenMaskList = unbrokenMaskList;
module.exports.encode = encode;
module.exports.chainFilter = chainFilter;
module.exports.possibleVariants = possibleVariants;
