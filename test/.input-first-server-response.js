module.exports = () => {
  return {
    data: {
      step: 1,
      userStep: {
        user1: 0
      },
      currW: [
        0.5,
        0.5
      ],
      prevW: [
        0.5,
        0.5
      ],
      prevObjective: 1000000000000000,
      currObjective: null,
      eta: 0.1,
      prevGradient: [
        0,
        0
      ],
      lambda: 0
    }
  };
}
