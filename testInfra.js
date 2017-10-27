// This file contains the base infrastructure used for the travis build.
function infraGetter(kelda) {
  const vmTemplate = new kelda.Machine({ provider: 'Amazon' });
  const infra = new kelda.Infrastructure(vmTemplate, vmTemplate.replicate(2));
  return infra;
}

module.exports = infraGetter;
